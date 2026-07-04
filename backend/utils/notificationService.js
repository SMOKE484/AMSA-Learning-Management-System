import { Expo } from 'expo-server-sdk';
import Student from '../models/student.js';
import User from '../models/user.js';
import Notification from '../models/notification.js';

const expo = new Expo();

/**
 * Remove a push token from any user that holds it (device uninstalled the app
 * or the token was rotated). Prevents wasting sends on dead tokens forever.
 */
const removeDeadToken = async (token) => {
  try {
    await User.updateMany({ pushToken: token }, { $set: { pushToken: null } });
    console.log(`🧹 Removed dead push token ${token.slice(0, 24)}…`);
  } catch (err) {
    console.error('Failed to remove dead push token:', err);
  }
};

/**
 * Central push sender: chunks messages, sends them, and checks delivery
 * receipts ~15 minutes later so DeviceNotRegistered tokens get cleaned up.
 * All existing send functions route through this.
 */
export const sendPushMessages = async (messages) => {
  if (!messages || messages.length === 0) return 0;

  const tickets = []; // { id, token }
  const chunks = expo.chunkPushNotifications(messages);
  for (const chunk of chunks) {
    try {
      const chunkTickets = await expo.sendPushNotificationsAsync(chunk);
      chunkTickets.forEach((ticket, i) => {
        const token = chunk[i]?.to;
        if (ticket.status === 'error') {
          if (ticket.details?.error === 'DeviceNotRegistered' && token) {
            removeDeadToken(token);
          } else {
            console.error('Push ticket error:', ticket.message);
          }
        } else if (ticket.id) {
          tickets.push({ id: ticket.id, token });
        }
      });
    } catch (error) {
      console.error('Error sending notification chunk:', error);
    }
  }

  // Check receipts after Expo has had time to deliver (fire-and-forget)
  if (tickets.length > 0) {
    const timer = setTimeout(() => checkPushReceipts(tickets), 15 * 60 * 1000);
    timer.unref?.(); // don't keep the process alive for this
  }

  return messages.length;
};

const checkPushReceipts = async (tickets) => {
  try {
    const tokenByTicketId = new Map(tickets.map(t => [t.id, t.token]));
    const idChunks = expo.chunkPushNotificationReceiptIds([...tokenByTicketId.keys()]);
    for (const ids of idChunks) {
      const receipts = await expo.getPushNotificationReceiptsAsync(ids);
      for (const [id, receipt] of Object.entries(receipts)) {
        if (receipt.status === 'error') {
          const token = tokenByTicketId.get(id);
          if (receipt.details?.error === 'DeviceNotRegistered' && token) {
            await removeDeadToken(token);
          } else {
            console.error('Push receipt error:', receipt.message);
          }
        }
      }
    }
  } catch (error) {
    console.error('Push receipt check error:', error);
  }
};

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
      await sendPushMessages(messages);
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

    await sendPushMessages(messages);
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

    await sendPushMessages(messages);
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
      await sendPushMessages(messages);
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
    await sendPushMessages(messages);
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
    await sendPushMessages(messages);
    console.log(`⚠️ Sent absent alert to parents of ${student.user.name}`);

  } catch (error) {
    console.error('❌ Absent Notification Error:', error);
  }
};

/**
 * 6b. Send "Absent Alert" for MANY students in one pass (used by the cron job)
 * One DB query + one chunked push send instead of a query/send per student.
 */
export const sendAbsentAlertsBatch = async (studentIds, classDetails) => {
  try {
    if (!studentIds || studentIds.length === 0) return;

    const students = await Student.find({ _id: { $in: studentIds } })
      .populate('user', 'name')
      .populate('parents', 'pushToken');

    const startTime = classDetails.classStartTime || classDetails.startTime || new Date();
    const timeString = new Date(startTime).toLocaleTimeString('en-ZA', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    const messages = [];
    for (const student of students) {
      if (!student.parents?.length) continue;
      for (const parent of student.parents) {
        if (parent.pushToken && Expo.isExpoPushToken(parent.pushToken)) {
          messages.push({
            to: parent.pushToken,
            sound: 'default',
            title: 'Absent Alert ⚠️',
            body: `Urgent: ${student.user?.name || 'Your child'} did not sign the register for ${classDetails.subject} (${timeString}).`,
            data: { screen: 'ChildSchedule', studentId: student._id },
            priority: 'high',
            channelId: 'default',
          });
        }
      }
    }

    if (messages.length === 0) return;

    await sendPushMessages(messages);
    console.log(`⚠️ Sent ${messages.length} absent alerts for ${students.length} students`);
  } catch (error) {
    console.error('❌ Batch Absent Notification Error:', error);
  }
};

/**
 * 7. Send "Manual Attendance" Notification (Student + Parents)
 * Triggered when an admin or tutor manually marks a student's attendance
 */
export const sendManualAttendanceNotification = async (studentId, classDetails, status, markedByRole) => {
  try {
    const student = await Student.findById(studentId)
      .populate('user', 'name pushToken')
      .populate('parents');

    if (!student) return;

    const statusLabel = { present: 'present', absent: 'absent', late: 'late', excused: 'excused' }[status] || status;
    const subject = classDetails.subject || 'class';

    const messages = [];

    // Notify the student
    if (student.user?.pushToken && Expo.isExpoPushToken(student.user.pushToken)) {
      messages.push({
        to: student.user.pushToken,
        sound: 'default',
        title: 'Attendance Updated',
        body: `You've been marked ${statusLabel} for the ${subject} class.`,
        data: { screen: 'Attendance' },
        priority: 'high'
      });
    }

    // Notify parents
    if (student.parents?.length > 0) {
      student.parents.forEach(parent => {
        if (parent.pushToken && Expo.isExpoPushToken(parent.pushToken)) {
          messages.push({
            to: parent.pushToken,
            sound: 'default',
            title: 'Attendance Alert 🏫',
            body: `${student.user?.name} has been marked ${statusLabel} for the ${subject} class.`,
            data: { screen: 'ChildSchedule', studentId: student._id },
            priority: 'high'
          });
        }
      });
    }

    if (messages.length === 0) return;

    await sendPushMessages(messages);
    console.log(`✅ Manual attendance notifications sent for ${student.user?.name} (${statusLabel})`);
  } catch (error) {
    console.error('❌ Manual Attendance Notification Error:', error);
  }
};

/**
 * 8. Send Bulk Notifications (Admin/General)
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
      await sendPushMessages(messages);
      console.log(`🚀 Sent ${messages.length} bulk notifications.`);
    }

    return messages.length;
  } catch (error) {
    console.error("Bulk Notification Error:", error);
  }
};

/**
 * 9. Send Weekly Activity Report to a single parent
 */
export const sendWeeklyReport = async (parent, summaryMessage, weekStart) => {
  try {
    const dateLabel = weekStart.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });
    const title = `Weekly Report — w/c ${dateLabel}`;

    await Notification.create({
      recipient:     parent._id,
      recipientType: 'parent',
      title,
      message:       summaryMessage,
      type:          'weekly_report',
      priority:      'normal',
      data:          { screen: 'Attendance' },
    });

    if (parent.pushToken && Expo.isExpoPushToken(parent.pushToken)) {
      await sendPushMessages([{
        to:    parent.pushToken,
        sound: 'default',
        title,
        body:  "Your children's weekly activity report is ready. Tap to view.",
        data:  { screen: 'Attendance' },
      }]);
    }

    console.log(`📊 Weekly report sent to parent ${parent._id}`);
  } catch (error) {
    console.error('❌ Weekly Report Notification Error:', error);
  }
};

/**
 * 10. Cleanup Old Notifications
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
  sendPushMessages,
  sendClassNotification,
  sendCheckInAvailableNotification,
  sendNoteNotification,
  sendMarksNotification,
  sendAttendanceConfirmation,
  sendAbsentAlert,
  sendAbsentAlertsBatch,
  sendManualAttendanceNotification,
  sendBulkNotifications,
  sendWeeklyReport,
  cleanupExpiredNotifications,
  processPendingNotifications
};
