import express from "express";
import authMiddleware from "../middlewares/authmiddleware.js";
import { sendMessage, getMessages, getConversations, deleteConversation } from "../controllers/messagecontroller.js";

const router = express.Router();

// All message routes require authentication
router.use(authMiddleware);

router.post("/send", sendMessage);
router.get("/conversations/list", getConversations);
router.delete("/conversation/:username", deleteConversation);
router.get("/:username", getMessages);

export default router;
