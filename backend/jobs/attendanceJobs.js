import cron from 'node-cron';
import ClassSchedule from "../models/classSchedule.js";
import Attendance from "../models/Attendance.js";
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
   * 2. Send 30-min reminders
   */
  static async checkUpcomingClasses() {
    try {
      const now = new Date();
      const in30Minutes = new Date(now.getTime() + 30 * 60000);

      const upcomingClasses = await ClassSchedule.find({
        classStartTime: { $gte: now, $lte: in30Minutes },
        status: 'scheduled'
      }).populate('students', 'user');

      for (const classItem of upcomingClasses) {
        const timeDiff = (new Date(classItem.classStartTime) - now) / 60000;
        
        if (timeDiff <= 30 && timeDiff > 29) {
          console.log(`Sending reminder for class: ${classItem.title}`);
          await NotificationService.sendClassNotification(
             classItem.students.map(s => s._id), 
             classItem
          );
        }
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
        status: 'ongoing' 
      }).populate('students');

      for (const classItem of classesToOpen) {
        // Send check-in available notifications
        // (Logic assumes NotificationService handles deduplication or it's okay to resend)
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
        status: { $ne: 'completed' } 
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
      const existingAttendance = await Attendance.find({ class: classItem._id });
      const presentStudentIds = existingAttendance
        .filter(a => a.status === 'present' || a.status === 'late')
        .map(a => a.student.toString());

      // 3. Identify who is missing
      const absentStudentIds = enrolledStudentIds.filter(id => !presentStudentIds.includes(id));

      if (absentStudentIds.length === 0) return;

      console.log(`Detected ${absentStudentIds.length} absentees for ${classItem.title}`);

      // 4. Process Absentees
      for (const studentId of absentStudentIds) {
        // A. Update Database
        await Attendance.findOneAndUpdate(
            { class: classItem._id, student: studentId },
            { 
                status: 'absent', 
                autoMarked: true,
                notes: 'Auto-marked by system - Register Closed'
            },
            { upsert: true, new: true }
        );

        // B. Notify Parents
        await NotificationService.sendAbsentAlert(studentId, classItem);
      }
      
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