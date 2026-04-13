import User from "../models/usermodel.js";
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export const registerUser = async (req, res) => {
    try {
        const { username, name, email, password } = req.body;
        const existingUser = await User.findOne({
            $or: [{ username }, { email }]
        });

        if (existingUser) {
            // Deleted accounts still block username/email reuse
            if (existingUser.username === username) {
                return res.status(400).json({ message: "Username already exists" });
            }
            return res.status(400).json({ message: "Email already exists" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({
            username,
            name,
            email,
            password: hashedPassword
        });

        await newUser.save();

        // Auto-login: return token via secure cookie + user data
        const token = jwt.sign(
            { id: newUser._id },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.cookie('token', token, {
            httpOnly: true,
            secure: true, // Always secure for cross-site compatibility
            sameSite: 'none', // Needed for cross-site (Vercel/Render)
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.status(201).json({
            message: "User registered successfully",
            user: {
                id: newUser._id,
                username: newUser.username,
                name: newUser.name,
                email: newUser.email
            }
        });
    }
    catch (err) {
        res.status(500).json({
            message: err.message
        })
    }
};


export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "Invalid email" })
        }

        // Block deleted accounts with a clear message
        if (user.isDeleted) {
            return res.status(403).json({
                message: "This account has been deleted and can no longer be accessed."
            });
        }

        // Block banned accounts (risk limit exceeded)
        if (user.isBanned) {
            return res.status(403).json({
                message: "Your account has been suspended due to repeated security violations. Risk limit exceeded. You cannot log in to this account."
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid password' })
        }

        const token = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.cookie('token', token, {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        return res.status(200).json({
            message: "Login Successful",
            user: {
                id: user._id,
                username: user.username,
                name: user.name,
                email: user.email,
                isAdmin: !!user.isAdmin
            }
        });
    }
    catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

export const logoutUser = async (req, res) => {
    res.clearCookie('token', {
        httpOnly: true,
        secure: true,
        sameSite: 'none'
    });
    return res.status(200).json({ message: "Logout Successful" });
};