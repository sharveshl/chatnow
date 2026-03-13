import express from 'express';
import authMiddleware from '../middlewares/authmiddleware.js';
import User from '../models/usermodel.js';

const router = express.Router();
const ADMIN_EMAIL = 'loganathansharvesh14@gmail.com';

// Admin-only middleware
const adminOnly = (req, res, next) => {
    if (req.user.email !== ADMIN_EMAIL) {
        return res.status(403).json({ message: 'Admin access required' });
    }
    next();
};

// Check if current user is admin
router.get('/check', authMiddleware, (req, res) => {
    return res.status(200).json({ isAdmin: req.user.email === ADMIN_EMAIL });
});

// Get all flagged/banned users
router.get('/flagged-users', authMiddleware, adminOnly, async (req, res) => {
    try {
        const users = await User.find({
            $or: [
                { isBanned: true },
                { riskScore: { $gt: 0 } }
            ]
        })
            .select('username name email riskScore isBanned lastKnownLocation createdAt updatedAt')
            .sort({ riskScore: -1 })
            .lean();

        return res.status(200).json(users);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
});

// Manually ban a user
router.post('/ban-user/:userId', authMiddleware, adminOnly, async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.params.userId,
            { isBanned: true },
            { new: true }
        ).select('username name email riskScore isBanned lastKnownLocation');

        if (!user) return res.status(404).json({ message: 'User not found' });

        return res.status(200).json({ message: `${user.username} has been banned`, user });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
});

// Unban a user
router.post('/unban-user/:userId', authMiddleware, adminOnly, async (req, res) => {
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

export default router;
