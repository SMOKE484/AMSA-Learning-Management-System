import express from "express";
import { login, logout, changePassword, updatePushToken } from "../controllers/authController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/login", login);
router.post("/logout", logout);
router.post("/change-password", authenticate, changePassword);
router.put("/push-token", authenticate, updatePushToken); // New Endpoint

export default router;