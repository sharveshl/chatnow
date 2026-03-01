import Message from "../models/messagemodel.js";
import User from "../models/usermodel.js";
import mongoose from "mongoose";

// Send a message
export const sendMessage = async (req, res) => {
    try {
        const { receiverUsername, content } = req.body;
        const senderId = req.user._id;

        if (!receiverUsername || !content?.trim()) {
            return res.status(400).json({ message: "Receiver username and content are required" });
        }

        const receiver = await User.findOne({ username: receiverUsername }).select('_id username name').lean();
        if (!receiver) {
            return res.status(404).json({ message: "User not found" });
        }

        if (receiver._id.toString() === senderId.toString()) {
            return res.status(400).json({ message: "Cannot send message to yourself" });
        }

        const message = new Message({
            sender: senderId,
            receiver: receiver._id,
            content: content.trim()
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
            content: message.content,
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

        // Build query filter
        const filter = {
            $or: [
                { sender: currentUserId, receiver: otherUser._id },
                { sender: otherUser._id, receiver: currentUserId }
            ]
        };

        // Cursor pagination: fetch messages older than `before`
        if (before && mongoose.Types.ObjectId.isValid(before)) {
            filter._id = { $lt: new mongoose.Types.ObjectId(before) };
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

        // Mark received messages as read (fire & forget)
        Message.updateMany(
            { sender: otherUser._id, receiver: currentUserId, status: { $ne: 'read' } },
            { $set: { status: 'read' } }
        ).exec();

        return res.status(200).json({ messages, hasMore });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

// Get all conversations (unique users chatted with + last message)
export const getConversations = async (req, res) => {
    try {
        const currentUserId = req.user._id;

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
                    lastMessage: { $first: "$content" },
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
                        { $project: { _id: 1, username: 1, name: 1, email: 1, profilePhoto: 1 } }
                    ]
                }
            },
            { $unwind: "$user" },
            {
                $project: {
                    _id: 0,
                    user: 1,
                    lastMessage: 1,
                    lastMessageTime: 1,
                    lastMessageSender: 1,
                    unreadCount: 1
                }
            }
        ]);

        return res.status(200).json(conversations);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

// Delete entire conversation between current user and another user
export const deleteConversation = async (req, res) => {
    try {
        const { username } = req.params;
        const currentUserId = req.user._id;

        const otherUser = await User.findOne({ username }).select('_id').lean();
        if (!otherUser) {
            return res.status(404).json({ message: "User not found" });
        }

        const result = await Message.deleteMany({
            $or: [
                { sender: currentUserId, receiver: otherUser._id },
                { sender: otherUser._id, receiver: currentUserId }
            ]
        });

        return res.status(200).json({
            message: "Conversation deleted",
            deletedCount: result.deletedCount
        });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};
