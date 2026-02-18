import express from "express";
import authMiddleware from "../middlewares/authmiddleware.js";
import User from "../models/usermodel.js";

const router = express.Router();

// Get current user
router.get("/me", authMiddleware, (req, res) => {
  return res.status(200).json(req.user);
});

// Search users by username or name
router.get("/search", authMiddleware, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 1) {
      return res.status(400).json({ message: "Search query is required" });
    }

    const users = await User.find({
      _id: { $ne: req.user._id },
      $or: [
        { username: { $regex: q.trim(), $options: "i" } },
        { name: { $regex: q.trim(), $options: "i" } }
      ]
    })
      .select("username name email")
      .limit(10);

    return res.status(200).json(users);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

export default router;
