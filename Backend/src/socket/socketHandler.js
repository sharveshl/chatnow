import jwt from 'jsonwebtoken';
import User from '../models/usermodel.js';
import Message from '../models/messagemodel.js';

// Map of userId (string) -> socketId
const onlineUsers = new Map();

export default function setupSocket(io) {
    // Authenticate socket connections via JWT
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token;
            if (!token) {
                return next(new Error('Authentication required'));
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.id).select('-password');
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

        // Track this user as online
        onlineUsers.set(userId, socket.id);

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

                // Validate
                if (!receiverUsername || !content?.trim()) {
                    return callback?.({ error: 'Receiver username and content are required' });
                }

                const receiver = await User.findOne({ username: receiverUsername });
                if (!receiver) {
                    return callback?.({ error: 'User not found' });
                }

                if (receiver._id.toString() === userId) {
                    return callback?.({ error: 'Cannot send message to yourself' });
                }

                // Create & save message
                const message = new Message({
                    sender: socket.user._id,
                    receiver: receiver._id,
                    content: content.trim(),
                    status: 'sent'
                });

                await message.save();

                // Populate sender & receiver for client
                const populated = await Message.findById(message._id)
                    .populate('sender', 'username name email profilePhoto')
                    .populate('receiver', 'username name email profilePhoto');

                // ACK to sender (step 5: ✓ Sent)
                callback?.({ message: populated });

                // Check if receiver is online (step 7)
                const receiverSocketId = onlineUsers.get(receiver._id.toString());
                if (receiverSocketId) {
                    // Push to receiver via WebSocket
                    io.to(receiverSocketId).emit('receive_message', populated);

                    // Mark as delivered
                    await Message.findByIdAndUpdate(message._id, { status: 'delivered' });

                    // Notify sender of delivery (✓✓ Delivered)
                    socket.emit('message_delivered', {
                        messageId: message._id.toString(),
                        receiverUsername
                    });
                }
                // If receiver is offline, message stays as 'sent' — delivered when they come online
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

                const sender = await User.findOne({ username: senderUsername });
                if (!sender) return;

                // Update all unread messages from this sender to this user
                const result = await Message.updateMany(
                    {
                        sender: sender._id,
                        receiver: socket.user._id,
                        status: { $ne: 'read' }
                    },
                    { $set: { status: 'read' } }
                );

                if (result.modifiedCount > 0) {
                    // Notify the sender that their messages were read
                    const senderSocketId = onlineUsers.get(sender._id.toString());
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

        // ─── TYPING INDICATORS ──────────────────────────────────────
        socket.on('typing_start', (data) => {
            const { receiverUsername } = data;
            // Find the receiver and forward the typing event
            for (const [uid, sid] of onlineUsers.entries()) {
                if (sid !== socket.id) {
                    io.to(sid).emit('user_typing', {
                        username: socket.user.username,
                        receiverUsername
                    });
                }
            }
        });

        socket.on('typing_stop', (data) => {
            const { receiverUsername } = data;
            for (const [uid, sid] of onlineUsers.entries()) {
                if (sid !== socket.id) {
                    io.to(sid).emit('user_stopped_typing', {
                        username: socket.user.username,
                        receiverUsername
                    });
                }
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
        const pendingMessages = await Message.find({
            receiver: userId,
            status: 'sent'
        }).populate('sender', 'username name email profilePhoto');

        if (pendingMessages.length === 0) return;

        // Mark all as delivered
        const messageIds = pendingMessages.map(m => m._id);
        await Message.updateMany(
            { _id: { $in: messageIds } },
            { $set: { status: 'delivered' } }
        );

        // Notify each sender that their messages were delivered
        const senderGroups = {};
        for (const msg of pendingMessages) {
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
