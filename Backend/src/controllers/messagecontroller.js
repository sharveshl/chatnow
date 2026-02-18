import Message from "../models/messagemodel.js";
import User from "../models/usermodel.js";

// Send a message
export const sendMessage = async (req, res) => {
    try {
        const { receiverUsername, content } = req.body;
        const senderId = req.user._id;

        if (!receiverUsername || !content?.trim()) {
            return res.status(400).json({ message: "Receiver username and content are required" });
        }

        const receiver = await User.findOne({ username: receiverUsername });
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

        const populated = await Message.findById(message._id)
            .populate('sender', 'username name email')
            .populate('receiver', 'username name email');

        return res.status(201).json(populated);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

// Get messages between current user and another user (by username)
export const getMessages = async (req, res) => {
    try {
        const { username } = req.params;
        const currentUserId = req.user._id;

        const otherUser = await User.findOne({ username });
        if (!otherUser) {
            return res.status(404).json({ message: "User not found" });
        }

        const messages = await Message.find({
            $or: [
                { sender: currentUserId, receiver: otherUser._id },
                { sender: otherUser._id, receiver: currentUserId }
            ]
        })
            .sort({ createdAt: 1 })
            .populate('sender', 'username name email')
            .populate('receiver', 'username name email');

        // Mark received messages as read
        await Message.updateMany(
            { sender: otherUser._id, receiver: currentUserId, read: false },
            { $set: { read: true } }
        );

        return res.status(200).json(messages);
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
                                        { $eq: ["$read", false] }
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
                    as: "user"
                }
            },
            { $unwind: "$user" },
            {
                $project: {
                    _id: 0,
                    user: {
                        _id: "$user._id",
                        username: "$user.username",
                        name: "$user.name",
                        email: "$user.email"
                    },
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
