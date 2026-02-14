import express from "express";
import authMiddleware from "../middlewares/authmiddleware.js";

const router = express.Router();

router.get("/me", authMiddleware, (req, res) => {
  return res.status(200).json(req.user);
});

export default router;
