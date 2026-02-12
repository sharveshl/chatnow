import express from "express";
import dotenv from "dotenv";
import mongoose from 'mongoose';
import cors from 'cors';

dotenv.config();

const app = express();

app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URL)
.then(
    () => {
        console.log("DB connected successfully");
        app.listen(PORT, ()=>{
            console.log(`Server is running on port ${PORT}`);
        });
    }
)
.catch(
    (err) => {
        console.log("DB connection failed", err);
    }
)