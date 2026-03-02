import jwt from 'jsonwebtoken';
import User from '../models/usermodel.js';
import Message from '../models/messagemodel.js';
import { encryptMessage, decryptMessage } from '../utils/encryption.js';

// Map of userId (string) -> socketId
const onlineUsers = new Map();

// Cache: username -> userId (avoids repeated DB lookups for typing events)
const usernameToId = new Map();

async function resolveUserId(username) {
    if (usernameToId.has(username)) return usernameToId.get(username);
    const user = await User.findOne({ username }).select('_id').lean();
    if (user) {
        usernameToId.set(username, user._id.toString());
        return user._id.toString();
    }
    return null;
}

export default function setupSocket(io) {
    // Authenticate socket connections via JWT
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token;
            if (!token) {
                return next(new Error('Authentication required'));
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.id).select('-password').lean();
            if (!user) {
                return next(new Error('User not found'));
            }

            socket.user = user;
            next();
        } catch (err) {
            next(new Error('Invalid token'));
        }
    });

    io.on('connection', (socket) => {
        const userId = socket.user._id.toString();
        console.log(`✓ User connected: ${socket.user.username} (${userId})`);

        // Track this user as online & cache username->id
        onlineUsers.set(userId, socket.id);
        usernameToId.set(socket.user.username, userId);

        // Broadcast online status to all other users
        socket.broadcast.emit('user_online', { userId, username: socket.user.username });

        // Send the current list of online users to the newly connected user
        const onlineList = Array.from(onlineUsers.keys());
        socket.emit('online_users', onlineList);

        // Deliver any undelivered messages that were sent while this user was offline
        deliverPendingMessages(socket, userId, io);

        // ─── SEND MESSAGE ───────────────────────────────────────────
        socket.on('send_message', async (data, callback) => {
            try {
                const { receiverUsername, content } = data;

                if (!receiverUsername || !content?.trim()) {
                    return callback?.({ error: 'Receiver username and content are required' });
                }

                const receiver = await User.findOne({ username: receiverUsername }).select('_id username name isDeleted').lean();
                if (!receiver) {
                    return callback?.({ error: 'User not found' });
                }

                if (receiver.isDeleted) {
                    return callback?.({ error: 'This user has deleted their account' });
                }

                if (receiver._id.toString() === userId) {
                    return callback?.({ error: 'Cannot send message to yourself' });
                }

                // Encrypt before saving
                const { encrypted, iv, authTag } = encryptMessage(content.trim());

                // Create & save message
                const message = new Message({
                    sender: socket.user._id,
                    receiver: receiver._id,
                    encrypted,
                    iv,
                    authTag,
                    status: 'sent'
                });

                await message.save();

                // Build populated-like response manually (no extra DB query)
                const populated = {
                    _id: message._id,
                    sender: {
                        _id: socket.user._id,
                        username: socket.user.username,
                        name: socket.user.name
                    },
                    receiver: {
                        _id: receiver._id,
                        username: receiver.username,
                        name: receiver.name
                    },
                    content: content.trim(),
                    status: message.status,
                    createdAt: message.createdAt,
                    updatedAt: message.updatedAt
                };

                // ACK to sender
                callback?.({ message: populated });

                // Check if receiver is online
                const receiverSocketId = onlineUsers.get(receiver._id.toString());
                if (receiverSocketId) {
                    io.to(receiverSocketId).emit('receive_message', populated);

                    // Mark as delivered (fire & forget)
                    Message.findByIdAndUpdate(message._id, { status: 'delivered' }).exec();

                    socket.emit('message_delivered', {
                        messageId: message._id.toString(),
                        receiverUsername
                    });
                }
            } catch (err) {
                console.error('send_message error:', err);
                callback?.({ error: 'Failed to send message' });
            }
        });

        // ─── MESSAGE READ ───────────────────────────────────────────
        socket.on('message_read', async (data) => {
            try {
                const { senderUsername } = data;
                if (!senderUsername) return;

                // Use cached lookup
                const senderId = await resolveUserId(senderUsername);
                if (!senderId) return;

                const result = await Message.updateMany(
                    {
                        sender: senderId,
                        receiver: socket.user._id,
                        status: { $ne: 'read' }
                    },
                    { $set: { status: 'read' } }
                );

                if (result.modifiedCount > 0) {
                    const senderSocketId = onlineUsers.get(senderId);
                    if (senderSocketId) {
                        io.to(senderSocketId).emit('messages_read', {
                            readerUsername: socket.user.username,
                            readBy: userId
                        });
                    }
                }
            } catch (err) {
                console.error('message_read error:', err);
            }
        });

        // ─── TYPING INDICATORS — targeted to specific receiver ───
        socket.on('typing_start', async ({ receiverUsername }) => {
            if (!receiverUsername) return;
            const receiverId = await resolveUserId(receiverUsername);
            if (!receiverId) return;
            const sid = onlineUsers.get(receiverId);
            if (sid) {
                io.to(sid).emit('user_typing', { username: socket.user.username });
            }
        });

        socket.on('typing_stop', async ({ receiverUsername }) => {
            if (!receiverUsername) return;
            const receiverId = await resolveUserId(receiverUsername);
            if (!receiverId) return;
            const sid = onlineUsers.get(receiverId);
            if (sid) {
                io.to(sid).emit('user_stopped_typing', { username: socket.user.username });
            }
        });

        // ─── DISCONNECT ─────────────────────────────────────────────
        socket.on('disconnect', () => {
            console.log(`✗ User disconnected: ${socket.user.username}`);
            onlineUsers.delete(userId);
            socket.broadcast.emit('user_offline', { userId, username: socket.user.username });
        });
    });
}

// Deliver messages that were pending while user was offline
async function deliverPendingMessages(socket, userId, io) {
    try {
        let pendingMessages = await Message.find({
            receiver: userId,
            status: 'sent'
        })
            .populate('sender', 'username name')
            .populate('receiver', 'username name')
            .lean();

        if (pendingMessages.length === 0) return;

        // Decrypt each pending message
        const decryptedMessages = pendingMessages.map(msg => {
            try {
                return {
                    ...msg,
                    content: decryptMessage(msg.encrypted, msg.iv, msg.authTag),
                    encrypted: undefined,
                    iv: undefined,
                    authTag: undefined
                };
            } catch {
                return { ...msg, content: '[Unable to decrypt]', encrypted: undefined, iv: undefined, authTag: undefined };
            }
        });

        const messageIds = decryptedMessages.map(m => m._id);
        await Message.updateMany(
            { _id: { $in: messageIds } },
            { $set: { status: 'delivered' } }
        );

        // Emit each pending message to the receiver
        for (const msg of decryptedMessages) {
            socket.emit('receive_message', msg);
        }

        // Notify each sender that their messages were delivered
        const senderGroups = {};
        for (const msg of decryptedMessages) {
            const senderId = msg.sender._id.toString();
            if (!senderGroups[senderId]) {
                senderGroups[senderId] = [];
            }
            senderGroups[senderId].push(msg._id.toString());
        }

        for (const [senderId, msgIds] of Object.entries(senderGroups)) {
            const senderSocketId = onlineUsers.get(senderId);
            if (senderSocketId) {
                for (const messageId of msgIds) {
                    io.to(senderSocketId).emit('message_delivered', {
                        messageId,
                        receiverUsername: socket.user.username
                    });
                }
            }
        }
    } catch (err) {
        console.error('deliverPendingMessages error:', err);
    }
}
