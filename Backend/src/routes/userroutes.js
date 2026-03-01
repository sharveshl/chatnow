import express from "express";
import multer from "multer";
import path from "path";
import authMiddleware from "../middlewares/authmiddleware.js";
import User from "../models/usermodel.js";

const router = express.Router();

// Multer config for profile photo uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `profile_${req.user._id}_${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  }
});

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
      .select("username name email about profilePhoto")
      .limit(10)
      .lean();

    return res.status(200).json(users);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// Get any user's profile by username
router.get("/profile/:username", authMiddleware, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username })
      .select("username name email about profilePhoto createdAt")
      .lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json(user);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// Update own profile (about field)
router.put("/profile", authMiddleware, async (req, res) => {
  try {
    const { about } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { about: about || "" },
      { new: true }
    ).select("-password");

    return res.status(200).json(user);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// Upload profile photo
router.post("/profile/photo", authMiddleware, upload.single("photo"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const photoPath = `/uploads/${req.file.filename}`;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { profilePhoto: photoPath },
      { new: true }
    ).select("-password");

    return res.status(200).json(user);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

export default router;
