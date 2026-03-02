import Message from "../models/messagemodel.js";
import User from "../models/usermodel.js";
import DeletedChat from "../models/deletedchatmodel.js";
import mongoose from "mongoose";
import { encryptMessage, decryptMessage } from "../utils/encryption.js";

// Send a message
export const sendMessage = async (req, res) => {
    try {
        const { receiverUsername, content } = req.body;
        const senderId = req.user._id;

        if (!receiverUsername || !content?.trim()) {
            return res.status(400).json({ message: "Receiver username and content are required" });
        }

        const receiver = await User.findOne({ username: receiverUsername }).select('_id username name isDeleted').lean();
        if (!receiver) {
            return res.status(404).json({ message: "User not found" });
        }

        if (receiver.isDeleted) {
            return res.status(403).json({ message: "This user has deleted their account" });
        }

        if (receiver._id.toString() === senderId.toString()) {
            return res.status(400).json({ message: "Cannot send message to yourself" });
        }

        // Encrypt the message content
        const { encrypted, iv, authTag } = encryptMessage(content.trim());

        const message = new Message({
            sender: senderId,
            receiver: receiver._id,
            encrypted,
            iv,
            authTag
        });

        await message.save();

        // Build response manually instead of populate
        const responseMsg = {
            _id: message._id,
            sender: {
                _id: senderId,
                username: req.user.username,
                name: req.user.name
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

        return res.status(201).json(responseMsg);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

// Get messages between current user and another user — cursor pagination
export const getMessages = async (req, res) => {
    try {
        const { username } = req.params;
        const { before, limit: queryLimit } = req.query;
        const currentUserId = req.user._id;
        const limit = Math.min(parseInt(queryLimit) || 50, 100);

        const otherUser = await User.findOne({ username }).select('_id username name').lean();
        if (!otherUser) {
            return res.status(404).json({ message: "User not found" });
        }

        // Check if this user has soft-deleted this conversation
        const deletion = await DeletedChat.findOne({
            user: currentUserId,
            otherUser: otherUser._id
        }).lean();

        // Build query filter
        const filter = {
            $or: [
                { sender: currentUserId, receiver: otherUser._id },
                { sender: otherUser._id, receiver: currentUserId }
            ]
        };

        // Only show messages after the deletion timestamp
        if (deletion?.deletedAt) {
            filter.createdAt = { $gt: deletion.deletedAt };
        }

        // Cursor pagination: fetch messages older than `before`
        if (before && mongoose.Types.ObjectId.isValid(before)) {
            filter._id = { ...(filter._id || {}), $lt: new mongoose.Types.ObjectId(before) };
        }

        // Fetch limit+1 to check if there are more
        const messages = await Message.find(filter)
            .sort({ createdAt: -1 })
            .limit(limit + 1)
            .populate('sender', 'username name')
            .lean();

        const hasMore = messages.length > limit;
        if (hasMore) messages.pop();

        // Reverse to chronological order for display
        messages.reverse();

        // Decrypt each message before sending to client
        const decryptedMessages = messages.map(msg => {
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

        // Mark received messages as read (fire & forget)
        Message.updateMany(
            { sender: otherUser._id, receiver: currentUserId, status: { $ne: 'read' } },
            { $set: { status: 'read' } }
        ).exec();

        return res.status(200).json({ messages: decryptedMessages, hasMore });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

// Get all conversations (unique users chatted with + last message)
export const getConversations = async (req, res) => {
    try {
        const currentUserId = req.user._id;

        // Get all soft-deleted conversations for this user
        const deletions = await DeletedChat.find({ user: currentUserId }).lean();
        const deletionMap = {};
        for (const d of deletions) {
            deletionMap[d.otherUser.toString()] = d.deletedAt;
        }

        const conversations = await Message.aggregate([
            {
                $match: {
                    $or: [
                        { sender: currentUserId },
                        { receiver: currentUserId }
                    ]
                }
            },
            { $sort: { createdAt: -1 } },
            {
                $group: {
                    _id: {
                        $cond: [
                            { $eq: ["$sender", currentUserId] },
                            "$receiver",
                            "$sender"
                        ]
                    },
                    lastMessage: { $first: "$encrypted" },
                    lastMessageIv: { $first: "$iv" },
                    lastMessageAuthTag: { $first: "$authTag" },
                    lastMessageTime: { $first: "$createdAt" },
                    lastMessageSender: { $first: "$sender" },
                    unreadCount: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $eq: ["$receiver", currentUserId] },
                                        { $ne: ["$status", "read"] }
                                    ]
                                },
                                1,
                                0
                            ]
                        }
                    }
                }
            },
            { $sort: { lastMessageTime: -1 } },
            {
                $lookup: {
                    from: "users",
                    localField: "_id",
                    foreignField: "_id",
                    as: "user",
                    pipeline: [
                        { $project: { _id: 1, username: 1, name: 1, email: 1, profilePhoto: 1, isDeleted: 1 } }
                    ]
                }
            },
            { $unwind: "$user" },
            {
                $project: {
                    _id: 0,
                    otherUserId: "$_id",
                    user: 1,
                    lastMessage: 1,
                    lastMessageIv: 1,
                    lastMessageAuthTag: 1,
                    lastMessageTime: 1,
                    lastMessageSender: 1,
                    unreadCount: 1
                }
            }
        ]);

        // Filter out soft-deleted conversations (where lastMessageTime <= deletedAt)
        const filtered = conversations.filter(conv => {
            const deletedAt = deletionMap[conv.otherUserId?.toString()];
            if (!deletedAt) return true; // not deleted
            return conv.lastMessageTime > deletedAt; // only show if new messages after deletion
        });

        // Decrypt last message for each conversation & remove helper fields
        const result = filtered.map(({ otherUserId, lastMessageIv, lastMessageAuthTag, lastMessage, ...rest }) => {
            let decryptedLastMessage = lastMessage;
            try {
                if (lastMessage && lastMessageIv && lastMessageAuthTag) {
                    decryptedLastMessage = decryptMessage(lastMessage, lastMessageIv, lastMessageAuthTag);
                }
            } catch {
                decryptedLastMessage = '[Unable to decrypt]';
            }
            return { ...rest, lastMessage: decryptedLastMessage };
        });

        return res.status(200).json(result);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

// Soft-delete conversation — only hides messages for requesting user
export const deleteConversation = async (req, res) => {
    try {
        const { username } = req.params;
        const currentUserId = req.user._id;

        const otherUser = await User.findOne({ username }).select('_id').lean();
        if (!otherUser) {
            return res.status(404).json({ message: "User not found" });
        }

        // Upsert: set deletedAt to now (if re-deleting, update the timestamp)
        await DeletedChat.findOneAndUpdate(
            { user: currentUserId, otherUser: otherUser._id },
            { deletedAt: new Date() },
            { upsert: true, new: true }
        );

        return res.status(200).json({ message: "Chat deleted for you" });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

