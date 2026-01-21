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
    enum: ["class_reminder", "check_in_available", "announcement", "attendance_alert", "general"],
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

// === STATIC METHOD: Create Class Reminders ===
notificationSchema.statics.createClassReminders = async function(classSchedule, minutesBefore) {
  const notifications = [];

  // Iterate through all students in the class
  for (const student of classSchedule.students) {
    // Check if we already sent this specific reminder to this student
    const exists = await this.findOne({
      recipient: student.user._id, // Assumes student populated with user
      relatedClass: classSchedule._id,
      type: "class_reminder",
      // Optional: Check if created recently to allow re-sending if modified? 
      // For now, unique per class per student.
    });

    if (!exists) {
      notifications.push({
        recipient: student.user._id,
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
      });
    }
  }

  if (notifications.length > 0) {
    return await this.insertMany(notifications);
  }
  return [];
};

export default mongoose.model("Notification", notificationSchema);