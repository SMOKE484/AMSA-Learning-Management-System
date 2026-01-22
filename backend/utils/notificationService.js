import { Expo } from 'expo-server-sdk';
import Student from '../models/student.js';
import User from '../models/user.js';
import Notification from '../models/notification.js';

const expo = new Expo();

/**
 * Helper to get tokens for a list of student IDs
 */
const getTokensForStudents = async (studentIds) => {
  const students = await Student.find({ _id: { $in: studentIds } }).populate('user');
  const tokens = [];
  
  students.forEach(student => {
    if (student.user && student.user.pushToken && Expo.isExpoPushToken(student.user.pushToken)) {
      tokens.push(student.user.pushToken);
    }
  });
  
  return [...new Set(tokens)]; // Remove duplicates
};

/**
 * Helper to get tokens for PARENTS of specific students
 */
const getTokensForParents = async (studentIds) => {
  // Find students and populate their parents
  const students = await Student.find({ _id: { $in: studentIds } })
    .populate('parents'); // populates the User documents for parents
  
  const tokens = [];
  
  students.forEach(student => {
    if (student.parents && student.parents.length > 0) {
      student.parents.forEach(parent => {
        // Check if parent has a valid push token
        if (parent.pushToken && Expo.isExpoPushToken(parent.pushToken)) {
          tokens.push(parent.pushToken);
        }
      });
    }
  });
  
  return [...new Set(tokens)]; // Remove duplicates
};

/**
 * 1. Send "New Class" Notification (Students + Parents)
 */
export const sendClassNotification = async (studentIds, classDetails) => {
  try {
    const studentTokens = await getTokensForStudents(studentIds);
    const parentTokens = await getTokensForParents(studentIds);

    const messages = [];

    // Message for Students
    studentTokens.forEach(token => {
      messages.push({
        to: token,
        sound: 'default',
        title: 'New Class Scheduled 📅',
        body: `You have a new ${classDetails.subject} class scheduled for ${new Date(classDetails.scheduledDate).toDateString()} at ${classDetails.startTime}.`,
        data: { classId: classDetails._id, screen: 'Schedule' },
      });
    });

    // Message for Parents
    parentTokens.forEach(token => {
      messages.push({
        to: token,
        sound: 'default',
        title: 'New Class for your Child',
        body: `A ${classDetails.subject} class has been scheduled for ${new Date(classDetails.scheduledDate).toDateString()}.`,
        data: { classId: classDetails._id, screen: 'ChildSchedule' }, 
      });
    });

    if (messages.length > 0) {
      const chunks = expo.chunkPushNotifications(messages);
      for (const chunk of chunks) {
        try {
          await expo.sendPushNotificationsAsync(chunk);
        } catch (error) {
          console.error('Error sending notification chunk:', error);
        }
      }
      console.log(`✅ Class notifications sent to ${studentTokens.length} students and ${parentTokens.length} parents.`);
    }
  } catch (error) {
    console.error('❌ Notification Service Error:', error);
  }
};

/**
 * 2. Send "Check-in Available" Notification
 */
export const sendCheckInAvailableNotification = async (studentIds, classDetails) => {
  try {
    const pushTokens = await getTokensForStudents(studentIds);
    if (pushTokens.length === 0) return;

    const messages = pushTokens.map(token => ({
      to: token,
      sound: 'default',
      title: 'Register Is Now Open! 📍',
      body: `You can now sign the register for ${classDetails.subject}.`,
      data: { classId: classDetails._id, screen: 'Dashboard' },
      priority: 'high'
    }));

    const chunks = expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      await expo.sendPushNotificationsAsync(chunk);
    }
    console.log(`✅ Check-in alerts sent to ${pushTokens.length} students.`);
  } catch (error) {
    console.error('❌ Check-in Notification Error:', error);
  }
};

/**
 * 3. Send "New Note Uploaded" Notification (Students)
 */
export const sendNoteNotification = async (studentIds, noteDetails) => {
  try {
    const studentTokens = await getTokensForStudents(studentIds);
    if (studentTokens.length === 0) return;

    const messages = studentTokens.map(token => ({
      to: token,
      sound: 'default',
      title: 'New Study Material 📚',
      body: `New notes uploaded for ${noteDetails.subject}: "${noteDetails.title}"`,
      data: { noteId: noteDetails._id, screen: 'Notes' },
    }));

    const chunks = expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      await expo.sendPushNotificationsAsync(chunk);
    }
    console.log(`✅ Note notifications sent to ${studentTokens.length} students.`);
  } catch (error) {
    console.error('❌ Note Notification Error:', error);
  }
};

/**
 * 4. Send "New Marks Released" Notification (Students + Parents)
 */
export const sendMarksNotification = async (studentIds, assessmentDetails) => {
  try {
    const studentTokens = await getTokensForStudents(studentIds);
    const parentTokens = await getTokensForParents(studentIds);

    const messages = [];

    // Notify Student
    studentTokens.forEach(token => {
      messages.push({
        to: token,
        sound: 'default',
        title: 'Results Released 📊',
        body: `Marks for ${assessmentDetails.subject} (${assessmentDetails.testName}) are now available.`,
        data: { screen: 'Marks' },
      });
    });

    // Notify Parent
    parentTokens.forEach(token => {
      messages.push({
        to: token,
        sound: 'default',
        title: 'New Results Available',
        body: `New marks for ${assessmentDetails.subject} have been released for your child.`,
        data: { screen: 'ChildMarks' },
      });
    });

    if (messages.length > 0) {
      const chunks = expo.chunkPushNotifications(messages);
      for (const chunk of chunks) {
        await expo.sendPushNotificationsAsync(chunk);
      }
      console.log(`✅ Marks notifications sent to ${studentTokens.length} students and ${parentTokens.length} parents.`);
    }
  } catch (error) {
    console.error('❌ Marks Notification Error:', error);
  }
};

/**
 * 5. Send "Attendance Confirmation" (Parents Only)
 * Triggered when a student successfully checks in
 */
export const sendAttendanceConfirmation = async (studentId, classDetails, checkInTime) => {
  try {
    // 1. Fetch student to get their Name and Parent IDs
    const student = await Student.findById(studentId)
      .populate('user', 'name')
      .populate('parents');
    
    if (!student || !student.parents || student.parents.length === 0) return;

    // 2. Collect Parent Tokens
    const parentTokens = [];
    student.parents.forEach(parent => {
      if (parent.pushToken && Expo.isExpoPushToken(parent.pushToken)) {
        parentTokens.push(parent.pushToken);
      }
    });

    if (parentTokens.length === 0) return;

    // 3. Format Time
    const timeString = new Date(checkInTime).toLocaleTimeString('en-ZA', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });

    // 4. Create Message
    const messages = parentTokens.map(token => ({
      to: token,
      sound: 'default',
      title: 'Attendance Alert 🏫',
      body: `Safe at school: ${student.user.name} checked in for ${classDetails.subject} at ${timeString}.`,
      data: { 
        screen: 'ChildSchedule', 
        studentId: student._id 
      },
      priority: 'high'
    }));

    // 5. Send
    const chunks = expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      await expo.sendPushNotificationsAsync(chunk);
    }
    console.log(`✅ Parent attendance alerts sent for ${student.user.name}`);

  } catch (error) {
    console.error('❌ Attendance Notification Error:', error);
  }
};

/**
 * 6. Send "Absent Alert" (Parents Only)
 * Triggered automatically when the register closes and student is missing
 */
export const sendAbsentAlert = async (studentId, classDetails) => {
  try {
    // 1. Fetch student to get Name and Parents
    const student = await Student.findById(studentId)
      .populate('user', 'name')
      .populate('parents');
    
    if (!student || !student.parents || student.parents.length === 0) return;

    // 2. Collect Parent Tokens
    const parentTokens = [];
    student.parents.forEach(parent => {
      if (parent.pushToken && Expo.isExpoPushToken(parent.pushToken)) {
        parentTokens.push(parent.pushToken);
      }
    });

    if (parentTokens.length === 0) return;

    // 3. Format Time
    // Handle both Mongoose object or plain object
    const startTime = classDetails.classStartTime || classDetails.startTime || new Date();
    const timeString = new Date(startTime).toLocaleTimeString('en-ZA', { 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: true 
    });

    // 4. Create Message
    const messages = parentTokens.map(token => ({
      to: token,
      sound: 'default',
      title: 'Absent Alert ⚠️',
      body: `Urgent: ${student.user.name} did not sign the register for ${classDetails.subject} (${timeString}).`,
      data: { 
        screen: 'ChildSchedule', 
        studentId: student._id 
      },
      priority: 'high',
      channelId: 'default',
    }));

    // 5. Send
    const chunks = expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      await expo.sendPushNotificationsAsync(chunk);
    }
    console.log(`⚠️ Sent absent alert to parents of ${student.user.name}`);

  } catch (error) {
    console.error('❌ Absent Notification Error:', error);
  }
};

/**
 * 7. Send Bulk Notifications (Admin/General)
 */
export const sendBulkNotifications = async (notifications) => {
  try {
    if (!notifications || notifications.length === 0) return;

    const userIds = notifications.map(n => n.recipient);
    const users = await User.find({ _id: { $in: userIds } }).select('_id pushToken');
    
    const tokenMap = {};
    users.forEach(u => {
      if (u.pushToken && Expo.isExpoPushToken(u.pushToken)) {
        tokenMap[u._id.toString()] = u.pushToken;
      }
    });

    const messages = [];
    notifications.forEach(note => {
      const token = tokenMap[note.recipient.toString()];
      if (token) {
        messages.push({
          to: token,
          sound: 'default',
          title: note.title,
          body: note.message,
          data: note.data || {},
          priority: note.priority === 'high' ? 'high' : 'default'
        });
      }
    });

    if (messages.length > 0) {
      const chunks = expo.chunkPushNotifications(messages);
      for (const chunk of chunks) {
        await expo.sendPushNotificationsAsync(chunk);
      }
      console.log(`🚀 Sent ${messages.length} bulk notifications.`);
    }

    return messages.length;
  } catch (error) {
    console.error("Bulk Notification Error:", error);
  }
};

/**
 * 8. Cleanup Old Notifications
 */
export const cleanupExpiredNotifications = async () => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const result = await Notification.deleteMany({ 
      createdAt: { $lt: thirtyDaysAgo },
      read: true 
    });
    
    if (result.deletedCount > 0) {
      console.log(`🧹 Cleaned up ${result.deletedCount} old notifications.`);
    }
    return result.deletedCount;
  } catch (error) {
    console.error('Cleanup Error:', error);
  }
};

/**
 * 9. Process Pending Notifications
 */
export const processPendingNotifications = async () => {
  return { processed: 0 };
};

// Export Object
export const NotificationService = {
  sendClassNotification,
  sendCheckInAvailableNotification,
  sendNoteNotification,
  sendMarksNotification,
  sendAttendanceConfirmation,
  sendAbsentAlert,
  sendBulkNotifications,
  cleanupExpiredNotifications,
  processPendingNotifications
};
