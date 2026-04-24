import jwt from 'jsonwebtoken';
import User from '../models/usermodel.js';

const authMiddleware = async (req, res, next) => {
    try {
        let token = req.cookies?.token;

        if (!token) {
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                token = authHeader.split(' ')[1];
            }
        }

        if (!token) {
            return res.status(401).json({ message: "No token provided" });
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');
        if (!user || user.isDeleted) {
            return res.status(401).json({
                message: "Account not found or has been deleted"
            });
        }

        if (user.isBanned) {
            return res.status(403).json({
                message: "Your account has been suspended due to repeated security violations. You cannot access this application.",
                banned: true
            });
        }

        req.user = user;
        next();
    }
    catch (err) {
        return res.status(401).json({ message: "Invalid or expired token" });
    }

};

export default authMiddleware;