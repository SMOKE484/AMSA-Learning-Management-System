import ClassSchedule from "../models/classSchedule.js";
import { TimeService } from "../utils/timeService.js";

/**
 * Validate schedule creation/update for conflicts
 */
export const validateSchedule = async (req, res, next) => {
  try {
    const { scheduledDate, startTime, endTime, tutor } = req.body;
    const classId = req.params.id; // For updates, exclude current class

    // Basic time validation
    if (!scheduledDate || !startTime || !endTime) {
      return res.status(400).json({
        message: "scheduledDate, startTime, and endTime are required"
      });
    }

    // Validate time format
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      return res.status(400).json({
        message: "startTime and endTime must be in HH:MM format"
      });
    }

    // Validate end time is after start time
    const duration = TimeService.calculateDuration(startTime, endTime);
    if (duration <= 0) {
      return res.status(400).json({
        message: "endTime must be after startTime"
      });
    }

    // Validate class duration (minimum 15 minutes, maximum 4 hours)
    if (duration < 15) {
      return res.status(400).json({
        message: "Class duration must be at least 15 minutes"
      });
    }

    if (duration > 240) {
      return res.status(400).json({
        message: "Class duration cannot exceed 4 hours"
      });
    }

    // Validate date is not in the past
    const classDate = new Date(scheduledDate);
    if (classDate < new Date().setHours(0, 0, 0, 0)) {
      return res.status(400).json({
        message: "Cannot schedule classes in the past"
      });
    }

    // Check for conflicts
    const tutorId = tutor || req.tutorId;
    const conflict = await checkScheduleConflict(
      tutorId,
      scheduledDate,
      startTime,
      endTime,
      classId
    );

    if (conflict) {
      return res.status(409).json({
        message: "Schedule conflict detected",
        conflict: {
          existingClass: {
            id: conflict._id,
            title: conflict.title,
            subject: conflict.subject,
            scheduledDate: conflict.scheduledDate,
            startTime: conflict.startTime,
            endTime: conflict.endTime
          },
          requestedTime: {
            scheduledDate,
            startTime,
            endTime
          }
        }
      });
    }

    next();
  } catch (error) {
    console.error("Schedule validation error:", error);
    res.status(500).json({
      message: "Schedule validation failed",
      error: error.message
    });
  }
};

/**
 * Validate student assignment
 */
export const validateStudentAssignment = async (req, res, next) => {
  try {
    const { students } = req.body;

    if (!students || !Array.isArray(students)) {
      return next(); // No students to validate
    }

    // Check if students array exceeds maximum
    const maxStudents = req.body.maxStudents || 30;
    if (students.length > maxStudents) {
      return res.status(400).json({
        message: `Cannot assign more than ${maxStudents} students to a class`,
        current: students.length,
        maxAllowed: maxStudents
      });
    }

    // TODO: Check for student schedule conflicts
    // This would require checking each student's existing schedule

    next();
  } catch (error) {
    console.error("Student assignment validation error:", error);
    res.status(500).json({
      message: "Student assignment validation failed",
      error: error.message
    });
  }
};

/**
 * Check if tutor has permission to modify schedule
 */
export const validateTutorOwnership = async (req, res, next) => {
  try {
    const classId = req.params.id;

    if (!classId) {
      return next(); // New creation, no ownership check needed
    }

    const classSchedule = await ClassSchedule.findById(classId);
    if (!classSchedule) {
      return res.status(404).json({ message: "Class schedule not found" });
    }

    // Admin can modify any schedule
    if (req.role === "admin") {
      return next();
    }

    // Tutor can only modify their own schedules
    if (classSchedule.tutor.toString() !== req.tutorId) {
      return res.status(403).json({
        message: "Access denied: You can only modify your own class schedules"
      });
    }

    // Prevent modification of completed or cancelled classes
    if (['completed', 'cancelled'].includes(classSchedule.status)) {
      return res.status(400).json({
        message: `Cannot modify a ${classSchedule.status} class`
      });
    }

    next();
  } catch (error) {
    console.error("Tutor ownership validation error:", error);
    res.status(500).json({
      message: "Ownership validation failed",
      error: error.message
    });
  }
};

/**
 * Check if schedule can be cancelled
 */
export const validateCancellation = async (req, res, next) => {
  try {
    const classId = req.params.id;
    const classSchedule = await ClassSchedule.findById(classId);

    if (!classSchedule) {
      return res.status(404).json({ message: "Class schedule not found" });
    }

    // Cannot cancel completed classes
    if (classSchedule.status === 'completed') {
      return res.status(400).json({
        message: "Cannot cancel a completed class"
      });
    }

    // Warn if cancelling with short notice
    const classStart = classSchedule.classStartDateTime;
    const hoursUntilClass = TimeService.getMinutesUntil(classStart) / 60;

    if (hoursUntilClass < 24) {
      req.cancellationWarning = {
        message: "Cancelling with less than 24 hours notice",
        hoursUntilClass: Math.round(hoursUntilClass * 10) / 10
      };
    }

    next();
  } catch (error) {
    console.error("Cancellation validation error:", error);
    res.status(500).json({
      message: "Cancellation validation failed",
      error: error.message
    });
  }
};

// Helper function to check schedule conflicts
async function checkScheduleConflict(tutorId, scheduledDate, startTime, endTime, excludeId = null) {
  const classDate = new Date(scheduledDate);
  
  const filter = {
    tutor: tutorId,
    scheduledDate: classDate,
    status: { $in: ['scheduled', 'ongoing'] },
    $or: [
      // New class starts during existing class
      {
        $and: [
          { startTime: { $lte: startTime } },
          { endTime: { $gt: startTime } }
        ]
      },
      // New class ends during existing class
      {
        $and: [
          { startTime: { $lt: endTime } },
          { endTime: { $gte: endTime } }
        ]
      },
      // New class completely contains existing class
      {
        $and: [
          { startTime: { $gte: startTime } },
          { endTime: { $lte: endTime } }
        ]
      }
    ]
  };

  if (excludeId) {
    filter._id = { $ne: excludeId };
  }

  return await ClassSchedule.findOne(filter)
    .populate('tutor', 'user')
    .populate('tutor.user', 'name');
}
