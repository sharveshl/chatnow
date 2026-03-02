import express from "express";
import dotenv from "dotenv";
import mongoose from 'mongoose';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { Server } from 'socket.io';
import authRoutes from './routes/authroutes.js';
import userRoutes from './routes/userroutes.js';
import messageRoutes from './routes/messageroutes.js';
import groupRoutes from './routes/grouproutes.js';
import setupSocket from './socket/socketHandler.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

// Setup Socket.IO with CORS
const io = new Server(httpServer, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

app.use(express.json());
app.use(cors());

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