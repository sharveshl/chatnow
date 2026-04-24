import express from 'express';
import authMiddleware from '../middlewares/authmiddleware.js';
import User from '../models/usermodel.js';
import Message from '../models/messagemodel.js';
import Group from '../models/groupmodel.js';
import { onlineUsers } from '../socket/socketHandler.js';

// Factory — receives the io instance so we can emit to banned users in real-time
export default function createAdminRouter(io) {
    const router = express.Router();

    // Admin-only middleware
    const adminOnly = (req, res, next) => {
        if (!req.user.isAdmin) {
            return res.status(403).json({ message: 'Admin access required' });
        }
        next();
    };

    // Check if current user is admin
    router.get('/check', authMiddleware, (req, res) => {
        return res.status(200).json({ isAdmin: !!req.user.isAdmin });
    });

    // Get admin stats
    router.get('/stats', authMiddleware, adminOnly, async (req, res) => {
        try {
            const [totalUsers, totalMessages, totalGroups] = await Promise.all([
                User.countDocuments(),
                Message.countDocuments(),
                Group.countDocuments()
            ]);
            return res.status(200).json({ totalUsers, totalMessages, totalGroups });
        } catch (err) {
            return res.status(500).json({ message: err.message });
        }
    });

    // Get all users
    router.get('/users', authMiddleware, adminOnly, async (req, res) => {
        try {
            const users = await User.find({})
                .select('username name email about profilePhoto riskScore isBanned isDeleted lastKnownLocation lastLogin createdAt updatedAt isAdmin')
                .sort({ riskScore: -1 })
                .lean();

            return res.status(200).json(users);
        } catch (err) {
            return res.status(500).json({ message: err.message });
        }
    });

    // Manually ban a user
    router.post('/users/:userId/ban', authMiddleware, adminOnly, async (req, res) => {
        try {
            const user = await User.findByIdAndUpdate(
                req.params.userId,
                { isBanned: true },
                { new: true }
            ).select('username name email riskScore isBanned lastKnownLocation');

            if (!user) return res.status(404).json({ message: 'User not found' });

            // ── Real-time kick: emit account_banned to the user if they are currently online ──
            const targetSocketId = onlineUsers.get(req.params.userId.toString());
            if (targetSocketId) {
                io.to(targetSocketId).emit('account_banned', {
                    message: 'Your account has been banned by the administration. You have been logged out.'
                });
            }

            return res.status(200).json({ message: `${user.username} has been banned`, user });
        } catch (err) {
            return res.status(500).json({ message: err.message });
        }
    });

    // Unban a user
    router.post('/users/:userId/unban', authMiddleware, adminOnly, async (req, res) => {
        try {
            const user = await User.findByIdAndUpdate(
                req.params.userId,
                { isBanned: false, riskScore: 0 },
                { new: true }
            ).select('username name email riskScore isBanned lastKnownLocation');

            if (!user) return res.status(404).json({ message: 'User not found' });

            return res.status(200).json({ message: `${user.username} has been unbanned`, user });
        } catch (err) {
            return res.status(500).json({ message: err.message });
        }
    });

    return router;
}
