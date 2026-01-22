import Notification from "../models/notification.js";
import ClassSchedule from "../models/classSchedule.js";
import User from "../models/user.js";
import Tutor from "../models/tutor.js"; // Needed for permissions check
import { NotificationService } from "../utils/notificationService.js";

// Send class reminder notifications
export const sendClassReminders = async (req, res) => {
  try {
    const { classId, minutesBefore = 30 } = req.body;

    // Populate students -> user to get IDs for Notification creation
    const classSchedule = await ClassSchedule.findById(classId)
      .populate({
        path: "students",
        populate: { path: "user", select: "_id" }
      });

    if (!classSchedule) {
      return res.status(404).json({ message: "Class not found" });
    }

    // === FIX: Permission Logic ===
    if (req.role === "tutor") {
      const tutor = await Tutor.findOne({ user: req.userId });
      if (!tutor || classSchedule.tutor.toString() !== tutor._id.toString()) {
        return res.status(403).json({
          message: "Access denied: You can only send reminders for your own classes"
        });
      }
    }
    // =============================

    // Create notification records
    // (This calls the static method in the new Notification Model)
    const notifications = await Notification.createClassReminders(
      classSchedule, 
      minutesBefore
    );

    // actually send push notifications
    await NotificationService.sendBulkNotifications(notifications);

    res.json({
      message: `Reminders sent to ${notifications.length} students`,
      notificationsSent: notifications.length,
      // Calculate simple timestamp for UI feedback
      scheduledFor: new Date(new Date().getTime() + minutesBefore * 60000) 
    });

  } catch (error) {
    console.error("Send class reminders error:", error);
    res.status(500).json({
      message: "Failed to send class reminders",
      error: error.message
    });
  }
};

// Send check-in available notification
export const sendCheckInNotification = async (req, res) => {
  try {
    const { classId } = req.params;

    const classSchedule = await ClassSchedule.findById(classId)
      .populate({
        path: "students",
        populate: { path: "user", select: "_id" }
      });

    if (!classSchedule) {
      return res.status(404).json({ message: "Class not found" });
    }

    const notifications = [];

    // Safe check for students array
    if (classSchedule.students && classSchedule.students.length > 0) {
      for (const student of classSchedule.students) {
        if(student.user) { // Ensure user exists
            notifications.push({
                recipient: student.user._id,
                recipientType: 'student',
                title: 'Check-in Available',
                message: `Check-in is now available for ${classSchedule.title || classSchedule.subject}`,
                type: 'check_in_available',
                relatedClass: classSchedule._id,
                data: {
                  classId: classSchedule._id.toString(),
                  action: 'check_in'
                },
                priority: 'high'
            });
        }
      }
    }

    let createdNotifications = [];
    if (notifications.length > 0) {
        createdNotifications = await Notification.insertMany(notifications);
        await NotificationService.sendBulkNotifications(createdNotifications);
    }

    res.json({
      message: "Check-in notifications sent",
      notificationsSent: createdNotifications.length
    });

  } catch (error) {
    console.error("Send check-in notification error:", error);
    res.status(500).json({
      message: "Failed to send check-in notifications",
      error: error.message
    });
  }
};

// Get user notifications
export const getUserNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly = false } = req.query;
    const skip = (page - 1) * limit;

    const filter = { recipient: req.userId };
    // Convert string 'true' to boolean
    if (unreadOnly === 'true' || unreadOnly === true) {
      filter.read = false;
    }

    const notifications = await Notification.find(filter)
      .populate("relatedClass", "title subject")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Notification.countDocuments(filter);
    const unreadCount = await Notification.countDocuments({
      recipient: req.userId,
      read: false
    });

    res.json({
      notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      unreadCount
    });

  } catch (error) {
    console.error("Get user notifications error:", error);
    res.status(500).json({
      message: "Failed to fetch notifications",
      error: error.message
    });
  }
};

// Mark notification as read
export const markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;

    const notification = await Notification.findOne({
      _id: notificationId,
      recipient: req.userId
    });

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    notification.read = true;
    notification.readAt = new Date();
    await notification.save();

    res.json({
      message: "Notification marked as read",
      notification
    });

  } catch (error) {
    console.error("Mark notification as read error:", error);
    res.status(500).json({
      message: "Failed to mark notification as read",
      error: error.message
    });
  }
};

// Mark all notifications as read
export const markAllAsRead = async (req, res) => {
  try {
    const result = await Notification.updateMany(
      {
        recipient: req.userId,
        read: false
      },
      {
        $set: {
          read: true,
          readAt: new Date()
        }
      }
    );

    res.json({
      message: "All notifications marked as read",
      updatedCount: result.modifiedCount
    });

  } catch (error) {
    console.error("Mark all notifications as read error:", error);
    res.status(500).json({
      message: "Failed to mark all notifications as read",
      error: error.message
    });
  }
};

// Delete notification
export const deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;

    const result = await Notification.deleteOne({
      _id: notificationId,
      recipient: req.userId
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.json({
      message: "Notification deleted successfully"
    });

  } catch (error) {
    console.error("Delete notification error:", error);
    res.status(500).json({
      message: "Failed to delete notification",
      error: error.message
    });
  }
};

// Get notification statistics
export const getNotificationStats = async (req, res) => {
  try {
    // Need to cast req.userId to ObjectId for aggregation
    const userIdObj = new mongoose.Types.ObjectId(req.userId);

    const stats = await Notification.aggregate([
      {
        $match: {
          recipient: userIdObj,
          createdAt: {
            $gte: new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        }
      },
      {
        $group: {
          _id: "$type",
          count: { $sum: 1 },
          unread: {
            $sum: { $cond: [{ $eq: ["$read", false] }, 1, 0] }
          }
        }
      }
    ]);

    const totalStats = await Notification.aggregate([
      {
        $match: { recipient: userIdObj }
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          totalUnread: {
            $sum: { $cond: [{ $eq: ["$read", false] }, 1, 0] }
          },
          sentThisWeek: {
            $sum: {
              $cond: [
                {
                  $gte: [
                    "$createdAt",
                    new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000)
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    res.json({
      byType: stats,
      overall: totalStats[0] || { total: 0, totalUnread: 0, sentThisWeek: 0 }
    });

  } catch (error) {
    console.error("Get notification stats error:", error);
    res.status(500).json({
      message: "Failed to fetch notification statistics",
      error: error.message
    });
  }
};
