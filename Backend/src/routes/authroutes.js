import express from "express";
import { registerUser, loginUser } from "../controllers/authcontroller.js";
import authMiddleware from "../middlewares/authmiddleware.js";
const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
export default router;
