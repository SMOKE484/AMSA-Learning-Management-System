import express from "express";
import rateLimit from "express-rate-limit";
import {
  login, logout, changePassword, updatePushToken,
  sendVerificationEmail, verifyEmail,
  forgotPassword, verifyResetOTP, resetPassword,
} from "../controllers/authController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: "Too many login attempts, please try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: { message: "Too many requests, please wait before trying again." },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/login", loginLimiter, login);
router.post("/logout", logout);
router.post("/change-password", authenticate, changePassword);
router.put("/push-token", authenticate, updatePushToken);

// Email verification (authenticated — user is already logged in)
router.post("/send-verification-email", authenticate, otpLimiter, sendVerificationEmail);
router.post("/verify-email", authenticate, otpLimiter, verifyEmail);

// Forgot password (unauthenticated)
router.post("/forgot-password", otpLimiter, forgotPassword);
router.post("/verify-reset-otp", otpLimiter, verifyResetOTP);
router.post("/reset-password", otpLimiter, resetPassword);

export default router;
