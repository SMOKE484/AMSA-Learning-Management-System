import express from "express";
import rateLimit from "express-rate-limit";
import { login, logout, changePassword, updatePushToken } from "../controllers/authController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: "Too many login attempts, please try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/login", loginLimiter, login);
router.post("/logout", logout);
router.post("/change-password", authenticate, changePassword);
router.put("/push-token", authenticate, updatePushToken); // New Endpoint

export default router;