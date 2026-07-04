import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  recipientType: {
    type: String,
    enum: ["student", "tutor", "parent", "admin"],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ["class_reminder", "check_in_available", "announcement", "attendance_alert", "general", "weekly_report", "direct_message"],
    default: "general"
  },
  relatedClass: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ClassSchedule"
  },
  data: {
    type: Map,
    of: String // Flexible key-value pairs for navigation (e.g., { screen: 'ClassDetails', id: '123' })
  },
  read: {
    type: Boolean,
    default: false
  },
  readAt: Date,
  priority: {
    type: String,
    enum: ["low", "normal", "high"],
    default: "normal"
  }
}, { timestamps: true });

// Per-user notification feed + unread counts
notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });
// Hourly cleanup job scans by age
notificationSchema.index({ createdAt: 1 });
// Reminder dedup lookup
notificationSchema.index({ relatedClass: 1, type: 1, recipient: 1 });

// === STATIC METHOD: Create Class Reminders ===
notificationSchema.statics.createClassReminders = async function(classSchedule, minutesBefore) {
  const recipients = (classSchedule.students || [])
    .filter(s => s?.user?._id)
    .map(s => s.user._id);
  if (recipients.length === 0) return [];

  // One query to find who already got this reminder (was a findOne per student)
  const existing = await this.find({
    relatedClass: classSchedule._id,
    type: "class_reminder",
    recipient: { $in: recipients },
  }).select("recipient").lean();
  const alreadySent = new Set(existing.map(n => n.recipient.toString()));

  const notifications = recipients
    .filter(id => !alreadySent.has(id.toString()))
    .map(id => ({
      recipient: id,
      recipientType: 'student',
      title: 'Class Reminder',
      message: `Your class "${classSchedule.subject}" starts in ${minutesBefore} minutes.`,
      type: 'class_reminder',
      relatedClass: classSchedule._id,
      priority: 'high',
      data: {
        classId: classSchedule._id.toString(),
        screen: 'ClassDetails'
      }
    }));

  if (notifications.length > 0) {
    return await this.insertMany(notifications);
  }
  return [];
};

export default mongoose.model("Notification", notificationSchema);