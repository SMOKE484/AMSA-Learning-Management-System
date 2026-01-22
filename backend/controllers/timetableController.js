import ClassSchedule from "../models/classSchedule.js";
import Attendance from "../models/attendance.js";
import { TimeService } from "../utils/timeService.js";

// Get student timetable
export const getStudentTimetable = async (req, res) => {
  try {
    const { startDate, endDate, view = 'week' } = req.query;
    
    // Calculate date range based on view
    let rangeStart, rangeEnd;
    const today = new Date();
    
    if (view === 'day') {
      rangeStart = new Date(today);
      rangeStart.setHours(0, 0, 0, 0);
      rangeEnd = new Date(today);
      rangeEnd.setHours(23, 59, 59, 999);
    } else if (view === 'week') {
      // Start from Monday of current week
      const dayOfWeek = today.getDay();
      const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      rangeStart = new Date(today.setDate(diff));
      rangeStart.setHours(0, 0, 0, 0);
      rangeEnd = new Date(rangeStart);
      rangeEnd.setDate(rangeStart.getDate() + 6);
      rangeEnd.setHours(23, 59, 59, 999);
    } else if (view === 'month') {
      rangeStart = new Date(today.getFullYear(), today.getMonth(), 1);
      rangeEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      rangeEnd.setHours(23, 59, 59, 999);
    } else {
      // Use custom date range
      rangeStart = startDate ? new Date(startDate) : new Date();
      rangeEnd = endDate ? new Date(endDate) : new Date();
      rangeEnd.setDate(rangeEnd.getDate() + 7);
    }

    // Get classes for the student in the date range
    const classes = await ClassSchedule.find({
      students: req.studentId,
      scheduledDate: {
        $gte: rangeStart,
        $lte: rangeEnd
      },
      status: { $in: ['scheduled', 'ongoing'] }
    })
    .populate("tutor", "user")
    .populate("tutor.user", "name")
    .sort({ scheduledDate: 1, startTime: 1 });

    // Get attendance records for these classes
    const classIds = classes.map(cls => cls._id);
    const attendanceRecords = await Attendance.find({
      class: { $in: classIds },
      student: req.studentId
    });

    // Create attendance map for quick lookup
    const attendanceMap = new Map();
    attendanceRecords.forEach(record => {
      attendanceMap.set(record.class.toString(), record);
    });

    // Format timetable data
    const timetable = classes.map(cls => {
      const attendance = attendanceMap.get(cls._id.toString());
      const classStart = TimeService.combineDateAndTime(cls.scheduledDate, cls.startTime);
      const classEnd = TimeService.combineDateAndTime(cls.scheduledDate, cls.endTime);
      
      return {
        _id: cls._id,
        title: cls.title,
        subject: cls.subject,
        grade: cls.grade,
        date: cls.scheduledDate,
        day: TimeService.formatDate(cls.scheduledDate, 'EEEE'),
        startTime: cls.startTime,
        endTime: cls.endTime,
        duration: TimeService.calculateDuration(cls.startTime, cls.endTime),
        tutor: cls.tutor.user.name,
        room: cls.room,
        meetingLink: cls.meetingLink,
        status: cls.status,
        attendance: attendance ? {
          checkedIn: !!attendance.checkIn.timestamp,
          checkedOut: !!attendance.checkOut.timestamp,
          status: attendance.status,
          checkInTime: attendance.checkIn.timestamp,
          checkOutTime: attendance.checkOut.timestamp
        } : null,
        timing: {
          canCheckIn: cls.isCheckInAvailable(),
          canCheckOut: cls.isCheckOutAvailable(),
          isOngoing: TimeService.isClassOngoing(classStart, classEnd),
          startsIn: TimeService.getMinutesUntil(classStart),
          endsIn: TimeService.getMinutesUntil(classEnd)
        }
      };
    });

    // Group by date for easier frontend rendering
    const groupedTimetable = timetable.reduce((acc, item) => {
      const dateStr = TimeService.formatDate(item.date, 'yyyy-MM-dd');
      if (!acc[dateStr]) {
        acc[dateStr] = [];
      }
      acc[dateStr].push(item);
      return acc;
    }, {});

    res.json({
      timetable: groupedTimetable,
      dateRange: {
        start: rangeStart,
        end: rangeEnd,
        view
      },
      summary: {
        totalClasses: classes.length,
        upcoming: timetable.filter(cls => cls.timing.startsIn > 0).length,
        ongoing: timetable.filter(cls => cls.timing.isOngoing).length
      }
    });

  } catch (error) {
    console.error("Get student timetable error:", error);
    res.status(500).json({
      message: "Failed to fetch timetable",
      error: error.message
    });
  }
};

// Get tutor timetable
export const getTutorTimetable = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const rangeStart = startDate ? new Date(startDate) : new Date();
    const rangeEnd = endDate ? new Date(endDate) : new Date();
    rangeEnd.setDate(rangeEnd.getDate() + 7); // Default to one week

    // Get tutor's classes
    const classes = await ClassSchedule.find({
      tutor: req.tutorId,
      scheduledDate: {
        $gte: rangeStart,
        $lte: rangeEnd
      }
    })
    .populate("students", "user grade")
    .populate("students.user", "name")
    .sort({ scheduledDate: 1, startTime: 1 });

    // Get attendance summaries for each class
    const classIds = classes.map(cls => cls._id);
    const attendanceSummaries = await Attendance.aggregate([
      {
        $match: {
          class: { $in: classIds }
        }
      },
      {
        $group: {
          _id: "$class",
          present: {
            $sum: {
              $cond: [{ $in: ["$status", ["present", "late"]] }, 1, 0]
            }
          },
          absent: {
            $sum: {
              $cond: [{ $eq: ["$status", "absent"] }, 1, 0]
            }
          },
          total: { $sum: 1 }
        }
      }
    ]);

    const attendanceMap = new Map();
    attendanceSummaries.forEach(summary => {
      attendanceMap.set(summary._id.toString(), summary);
    });

    // Format timetable data
    const timetable = classes.map(cls => {
      const attendance = attendanceMap.get(cls._id.toString());
      const classStart = TimeService.combineDateAndTime(cls.scheduledDate, cls.startTime);
      const classEnd = TimeService.combineDateAndTime(cls.scheduledDate, cls.endTime);
      
      return {
        _id: cls._id,
        title: cls.title,
        subject: cls.subject,
        grade: cls.grade,
        date: cls.scheduledDate,
        startTime: cls.startTime,
        endTime: cls.endTime,
        duration: TimeService.calculateDuration(cls.startTime, cls.endTime),
        students: cls.students.length,
        room: cls.room,
        meetingLink: cls.meetingLink,
        status: cls.status,
        attendance: attendance || { present: 0, absent: 0, total: 0 },
        timing: {
          canCheckIn: cls.isCheckInAvailable(),
          canCheckOut: cls.isCheckOutAvailable(),
          isOngoing: TimeService.isClassOngoing(classStart, classEnd),
          startsIn: TimeService.getMinutesUntil(classStart),
          endsIn: TimeService.getMinutesUntil(classEnd)
        }
      };
    });

    // Group by date
    const groupedTimetable = timetable.reduce((acc, item) => {
      const dateStr = TimeService.formatDate(item.date, 'yyyy-MM-dd');
      if (!acc[dateStr]) {
        acc[dateStr] = [];
      }
      acc[dateStr].push(item);
      return acc;
    }, {});

    res.json({
      timetable: groupedTimetable,
      dateRange: {
        start: rangeStart,
        end: rangeEnd
      },
      summary: {
        totalClasses: classes.length,
        totalStudents: classes.reduce((sum, cls) => sum + cls.students.length, 0),
        upcoming: timetable.filter(cls => cls.timing.startsIn > 0).length,
        ongoing: timetable.filter(cls => cls.timing.isOngoing).length
      }
    });

  } catch (error) {
    console.error("Get tutor timetable error:", error);
    res.status(500).json({
      message: "Failed to fetch timetable",
      error: error.message
    });
  }
};

// Get today's schedule
export const getTodaysSchedule = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let classes = [];
    
    if (req.role === "student") {
      classes = await ClassSchedule.find({
        students: req.studentId,
        scheduledDate: {
          $gte: today,
          $lt: tomorrow
        },
        status: { $in: ['scheduled', 'ongoing'] }
      })
      .populate("tutor", "user")
      .populate("tutor.user", "name")
      .sort({ startTime: 1 });
    } else if (req.role === "tutor") {
      classes = await ClassSchedule.find({
        tutor: req.tutorId,
        scheduledDate: {
          $gte: today,
          $lt: tomorrow
        }
      })
      .populate("students", "user grade")
      .populate("students.user", "name")
      .sort({ startTime: 1 });
    }

    // Get current time for status calculation
    const now = new Date();

    const todaysClasses = classes.map(cls => {
      const classStart = TimeService.combineDateAndTime(cls.scheduledDate, cls.startTime);
      const classEnd = TimeService.combineDateAndTime(cls.scheduledDate, cls.endTime);
      
      let status = 'upcoming';
      if (now > classEnd) status = 'completed';
      else if (now >= classStart && now <= classEnd) status = 'ongoing';
      else if (now >= cls.checkInStart && now <= cls.checkInEnd) status = 'check-in-available';

      return {
        _id: cls._id,
        title: cls.title,
        subject: cls.subject,
        startTime: cls.startTime,
        endTime: cls.endTime,
        tutor: cls.tutor?.user?.name,
        students: req.role === "tutor" ? cls.students.length : undefined,
        room: cls.room,
        status,
        timing: {
          canCheckIn: cls.isCheckInAvailable(),
          canCheckOut: cls.isCheckOutAvailable()
        }
      };
    });

    res.json({
      date: today,
      classes: todaysClasses,
      summary: {
        total: todaysClasses.length,
        upcoming: todaysClasses.filter(cls => cls.status === 'upcoming').length,
        ongoing: todaysClasses.filter(cls => cls.status === 'ongoing').length,
        completed: todaysClasses.filter(cls => cls.status === 'completed').length
      }
    });

  } catch (error) {
    console.error("Get today's schedule error:", error);
    res.status(500).json({
      message: "Failed to fetch today's schedule",
      error: error.message
    });
  }
};

// Get weekly summary
export const getWeeklySummary = async (req, res) => {
  try {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    let query = {};
    
    if (req.role === "student") {
      query = { 
        students: req.studentId,
        scheduledDate: { $gte: startOfWeek, $lte: endOfWeek }
      };
    } else if (req.role === "tutor") {
      query = { 
        tutor: req.tutorId,
        scheduledDate: { $gte: startOfWeek, $lte: endOfWeek }
      };
    }

    const weeklyClasses = await ClassSchedule.find(query);

    // Group by day of week and calculate statistics
    const weeklySummary = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      
      const dayClasses = weeklyClasses.filter(cls => 
        TimeService.formatDate(cls.scheduledDate, 'yyyy-MM-dd') === 
        TimeService.formatDate(date, 'yyyy-MM-dd')
      );

      return {
        date,
        dayName: TimeService.formatDate(date, 'EEEE'),
        classCount: dayClasses.length,
        totalHours: dayClasses.reduce((sum, cls) => {
          return sum + TimeService.calculateDuration(cls.startTime, cls.endTime) / 60;
        }, 0)
      };
    });

    res.json({
      weekStart: startOfWeek,
      weekEnd: endOfWeek,
      summary: weeklySummary,
      total: {
        classes: weeklyClasses.length,
        hours: weeklySummary.reduce((sum, day) => sum + day.totalHours, 0)
      }
    });

  } catch (error) {
    console.error("Get weekly summary error:", error);
    res.status(500).json({
      message: "Failed to fetch weekly summary",
      error: error.message
    });
  }
};
