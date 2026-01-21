import express from "express";
import { authenticate, authorize } from "../middleware/authMiddleware.js";
import { 
  sendClassReminders,
  sendCheckInNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getNotificationStats
} from "../controllers/notificationController.js";

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get user notifications
router.get("/", getUserNotifications);

// Get notification statistics
router.get("/stats", getNotificationStats);

// Mark notification as read
router.patch("/:notificationId/read", markAsRead);

// Mark all notifications as read
router.patch("/read-all", markAllAsRead);

// Delete notification
router.delete("/:notificationId", deleteNotification);

// Tutor/Admin notification sending endpoints
router.post("/class-reminders", 
  authorize(["tutor", "admin"]),
  sendClassReminders
);

router.post("/:classId/check-in-notification", 
  authorize(["tutor", "admin"]),
  sendCheckInNotification
);

export default router;