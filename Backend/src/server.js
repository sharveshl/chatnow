import express from "express";
import dotenv from "dotenv";
import mongoose from 'mongoose';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/authroutes.js';
import userRoutes from './routes/userroutes.js';
import messageRoutes from './routes/messageroutes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(express.json());
app.use(cors());

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

const PORT = process.env.PORT || 5000;
mongoose.connect(process.env.MONGO_URL)
    .then(
        () => {
            console.log("DB connected successfully");
            app.listen(PORT, () => {
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