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
            const field = existingUser.username === username ? "Username" : "Email";
            return res.status(400).json({
                message: `${field} already exists`
            });
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

        // Auto-login: return token + user data after registration
        const token = jwt.sign(
            { id: newUser._id },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.status(201).json({
            message: "User registered successfully",
            token,
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
        const user = await User.findOne({
            email
        });
        if (!user) {
            return res.status(400).json({
                message: "Invalid email"
            })
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({
                message: 'Invalid password'
            })
        }

        const token = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        return res.status(200).json(
            {
                message: "Login Successful",
                token,
                user: {
                    id: user._id,
                    username: user.username,
                    name: user.name,
                    email: user.email
                }
            }
        );
    }
    catch (err) {
        return res.status(500).json({
            message: err.message
        });
    }
};