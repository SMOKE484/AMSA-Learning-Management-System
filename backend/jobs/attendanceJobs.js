import cron from 'node-cron';
import ClassSchedule from "../models/classSchedule.js";
import Attendance from "../models/attendance.js";
import { NotificationService } from "../utils/notificationService.js";
import { TimeService } from "../utils/timeService.js"; 

export class AttendanceJobs {
  static start() {
    console.log('Starting attendance automation jobs...');

    // Run every minute to check class timings
    cron.schedule('*/5 * * * *', async () => {
      try {
        await this.updateClassStatuses(); 
        await this.checkUpcomingClasses();
        await this.openCheckInWindows();
        await this.closeCheckInWindows();
        await this.closeCheckOutWindows();
      } catch (error) {
        console.error('Attendance job error:', error);
      }
    });

    // Run every hour to clean up old data
    cron.schedule('0 * * * *', async () => {
      await this.cleanupOldAttendanceRecords();
    });
  }

  /**
   * 1. Update class statuses based on EXACT Start/End Time
   * (Uses classStartTime/classEndTime fields)
   */
  static async updateClassStatuses() {
    try {
      const now = new Date();
      
      // A. Mark as ONGOING
      const started = await ClassSchedule.updateMany(
        {
          status: 'scheduled',
          classStartTime: { $lte: now }, 
          classEndTime: { $gte: now }    
        },
        {
          $set: { status: 'ongoing' }
        }
      );

      if (started.modifiedCount > 0) console.log(`Set ${started.modifiedCount} classes to ONGOING`);

      // B. Mark as COMPLETED
      const completed = await ClassSchedule.updateMany(
        {
          status: { $in: ['scheduled', 'ongoing'] },
          classEndTime: { $lt: now } 
        },
        {
          $set: { status: 'completed' }
        }
      );

      if (completed.modifiedCount > 0) console.log(`🏁 Set ${completed.modifiedCount} classes to COMPLETED`);

    } catch (error) {
      console.error('Update class statuses error:', error);
    }
  }

  /**
   * 2. Send 30-min reminders (once per class, tracked via reminderSent flag)
   */
  static async checkUpcomingClasses() {
    try {
      const now = new Date();
      const in30Minutes = new Date(now.getTime() + 30 * 60000);

      const upcomingClasses = await ClassSchedule.find({
        classStartTime: { $gte: now, $lte: in30Minutes },
        status: 'scheduled',
        reminderSent: { $ne: true }
      }).populate('students', 'user');

      for (const classItem of upcomingClasses) {
        console.log(`Sending reminder for class: ${classItem.title}`);
        // Flag first so a crash mid-send can't cause repeated spam
        await ClassSchedule.updateOne({ _id: classItem._id }, { $set: { reminderSent: true } });
        await NotificationService.sendClassNotification(
           classItem.students.map(s => s._id),
           classItem
        );
      }
    } catch (error) {
      console.error('Check upcoming classes error:', error);
    }
  }

  /**
   * 3. Open Check-in Windows (15 mins before end)
   */
  static async openCheckInWindows() {
    try {
      const now = new Date();
      
      const classesToOpen = await ClassSchedule.find({
        checkInStart: { $lte: now },
        checkInEnd: { $gte: now },
        status: 'ongoing',
        checkInNotificationSent: { $ne: true }
      }).populate('students');

      for (const classItem of classesToOpen) {
        await ClassSchedule.updateOne({ _id: classItem._id }, { $set: { checkInNotificationSent: true } });
        await NotificationService.sendCheckInAvailableNotification(
            classItem.students.map(s => s._id),
            classItem
        );
      }
    } catch (error) {
      console.error('Open check-in windows error:', error);
    }
  }

  /**
   * 4. Close Check-in & Auto-mark Absences
   */
  static async closeCheckInWindows() {
    try {
      const now = new Date();
      
      const classesToClose = await ClassSchedule.find({
        checkInEnd: { $lt: now },
        autoMarkAbsent: true 
      }).populate('students');

      for (const classItem of classesToClose) {
        // This function updates DB AND notifies parents
        await this.markAbsentStudents(classItem);
        
        // Disable the flag so we don't process this class again
        classItem.autoMarkAbsent = false; 
        await classItem.save();
        
        console.log(`Check-in window closed for: ${classItem.title}`);
      }
    } catch (error) {
      console.error('Close check-in windows error:', error);
    }
  }

  /**
   * 5. Close Check-out
   */
  static async closeCheckOutWindows() {
    try {
      const now = new Date();
      const classesToClose = await ClassSchedule.find({
        checkOutEnd: { $lt: now },
        status: { $in: ['scheduled', 'ongoing'] }
      });

      for (const classItem of classesToClose) {
        classItem.status = 'completed';
        await classItem.save();
        await this.finalizeAttendanceRecords(classItem);
      }
    } catch (error) {
      console.error('Close check-out windows error:', error);
    }
  }

  /**
   * Helper: Mark absent students AND Notify Parents
   */
  static async markAbsentStudents(classItem) {
    try {
      // 1. Get all enrolled student IDs
      const enrolledStudentIds = classItem.students.map(s => s._id.toString());

      // 2. Get students who successfully marked 'present' or 'late'
      const existingAttendance = await Attendance.find({ class: classItem._id })
        .select('student status').lean();
      const presentStudentIds = new Set(existingAttendance
        .filter(a => a.status === 'present' || a.status === 'late')
        .map(a => a.student.toString()));

      // 3. Identify who is missing
      const absentStudentIds = enrolledStudentIds.filter(id => !presentStudentIds.has(id));

      if (absentStudentIds.length === 0) return;

      console.log(`Detected ${absentStudentIds.length} absentees for ${classItem.title}`);

      // 4. One bulk upsert instead of a findOneAndUpdate per student
      await Attendance.bulkWrite(absentStudentIds.map(studentId => ({
        updateOne: {
          filter: { class: classItem._id, student: studentId },
          update: {
            $set: {
              status: 'absent',
              autoMarked: true,
              notes: 'Auto-marked by system - Register Closed'
            }
          },
          upsert: true,
        }
      })));

      // 5. One batched parent alert instead of a send per student
      await NotificationService.sendAbsentAlertsBatch(absentStudentIds, classItem);

    } catch (error) {
      console.error('Mark absent students error:', error);
    }
  }

  static async finalizeAttendanceRecords(classItem) {
    // Logic for finalizing records (e.g. left early)
  }

  static async cleanupOldAttendanceRecords() {
    try {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      await Attendance.deleteMany({ createdAt: { $lt: oneYearAgo } });
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }

  static async runAllJobsManually() {
    console.log('Running all attendance jobs manually...');
    await this.updateClassStatuses();
    await this.checkUpcomingClasses();
    await this.openCheckInWindows();
    await this.closeCheckInWindows();
    console.log('All attendance jobs completed manually');
  }
}
