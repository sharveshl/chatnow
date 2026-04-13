import express from "express";
import dotenv from "dotenv";
import mongoose from 'mongoose';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { Server } from 'socket.io';
import authRoutes from './routes/authroutes.js';
import userRoutes from './routes/userroutes.js';
import messageRoutes from './routes/messageroutes.js';
import groupRoutes from './routes/grouproutes.js';
import adminRoutes from './routes/adminroutes.js';
import setupSocket from './socket/socketHandler.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

const allowedOrigins = [
    process.env.FRONTEND_URL,
    'https://chatnoww.vercel.app',
    'http://localhost:5173',
    'http://127.0.0.1:5173'
].filter(Boolean);

const corsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

// Setup Socket.IO with CORS
const io = new Server(httpServer, {
    cors: corsOptions
});

app.use(express.json());
app.use(cookieParser());
app.use(cors(corsOptions));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

const PORT = process.env.PORT || 5000;
mongoose.connect(process.env.MONGO_URL)
    .then(
        () => {
            console.log("DB connected successfully");

            // Initialize WebSocket handler
            setupSocket(io);

            httpServer.listen(PORT, () => {
                console.log(`Server is running on port ${PORT}`);
            });
        }
    )
    .catch(
        (err) => {
            console.log("DB connection failed", err);
        }
    )

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/admin', adminRoutes);