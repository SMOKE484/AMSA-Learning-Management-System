import ClassSchedule from "../models/ClassSchedule.js";
import { TimeService } from "../utils/timeService.js";

/**
 * Validate if check-in is currently available for a class
 */
export const validateCheckInWindow = async (req, res, next) => {
  try {
    const { classId } = req.params;
    
    const classSchedule = await ClassSchedule.findById(classId);
    if (!classSchedule) {
      return res.status(404).json({ message: "Class not found" });
    }

    const now = new Date();
    
    // Check if check-in window is open
    if (!classSchedule.isCheckInAvailable()) {
      return res.status(403).json({
        message: "Check-in is not available at this time",
        details: {
          checkInWindow: {
            opens: classSchedule.checkInStart,
            closes: classSchedule.checkInEnd
          },
          currentTime: now,
          classTime: {
            starts: classSchedule.classStartDateTime,
            ends: classSchedule.classEndDateTime
          }
        }
      });
    }

    // Check if class hasn't started too long ago (grace period)
    const minutesSinceClassStart = TimeService.getMinutesUntil(
      classSchedule.classStartDateTime
    ) * -1; // Convert to positive number

    if (minutesSinceClassStart > 15) {
      return res.status(403).json({
        message: "Check-in period has ended. You're too late for this class.",
        minutesLate: Math.round(minutesSinceClassStart - 15)
      });
    }

    req.classSchedule = classSchedule;
    next();

  } catch (error) {
    console.error("Check-in window validation error:", error);
    res.status(500).json({
      message: "Check-in validation failed",
      error: error.message
    });
  }
};

/**
 * Validate if check-out is currently available for a class
 */
export const validateCheckOutWindow = async (req, res, next) => {
  try {
    const { classId } = req.params;
    
    const classSchedule = await ClassSchedule.findById(classId);
    if (!classSchedule) {
      return res.status(404).json({ message: "Class not found" });
    }

    const now = new Date();
    
    // Check if check-out window is open
    if (!classSchedule.isCheckOutAvailable()) {
      return res.status(403).json({
        message: "Check-out is not available at this time",
        details: {
          checkOutWindow: {
            opens: classSchedule.checkOutStart,
            closes: classSchedule.checkOutEnd
          },
          currentTime: now,
          classTime: {
            started: classSchedule.classStartDateTime,
            ends: classSchedule.classEndDateTime
          }
        }
      });
    }

    // Additional validation: must have checked in first
    // This will be checked in the controller, but we can add it here too

    req.classSchedule = classSchedule;
    next();

  } catch (error) {
    console.error("Check-out window validation error:", error);
    res.status(500).json({
      message: "Check-out validation failed",
      error: error.message
    });
  }
};

/**
 * Validate if class is currently active (for real-time operations)
 */
export const validateClassActive = async (req, res, next) => {
  try {
    const { classId } = req.params;
    
    const classSchedule = await ClassSchedule.findById(classId);
    if (!classSchedule) {
      return res.status(404).json({ message: "Class not found" });
    }

    // Check if class is in a valid state for attendance operations
    if (!['scheduled', 'ongoing'].includes(classSchedule.status)) {
      return res.status(403).json({
        message: `Class is ${classSchedule.status}. Attendance operations are not available.`,
        validStatuses: ['scheduled', 'ongoing']
      });
    }

    req.classSchedule = classSchedule;
    next();

  } catch (error) {
    console.error("Class active validation error:", error);
    res.status(500).json({
      message: "Class validation failed",
      error: error.message
    });
  }
};

/**
 * Prevent duplicate check-ins
 */
export const preventDuplicateCheckIn = async (req, res, next) => {
  try {
    const { classId } = req.params;
    const { studentId } = req;

    // This would typically check the database for existing check-in
    // For now, we'll rely on the controller to handle this
    // In a more advanced implementation, you could cache recent check-ins
    
    next();

  } catch (error) {
    console.error("Duplicate check-in prevention error:", error);
    res.status(500).json({
      message: "Duplicate check-in validation failed",
      error: error.message
    });
  }
};

/**
 * Validate attendance timing for manual overrides (admin/tutor)
 */
export const validateManualAttendanceTime = async (req, res, next) => {
  try {
    const { checkInTime, checkOutTime } = req.body;
    const { classId } = req.params;

    const classSchedule = await ClassSchedule.findById(classId);
    if (!classSchedule) {
      return res.status(404).json({ message: "Class not found" });
    }

    const now = new Date();

    // Validate check-in time if provided
    if (checkInTime) {
      const checkInDate = new Date(checkInTime);
      
      if (checkInDate > now) {
        return res.status(400).json({
          message: "Check-in time cannot be in the future"
        });
      }

      if (checkInDate < classSchedule.checkInStart) {
        return res.status(400).json({
          message: "Check-in time cannot be before the check-in window opened",
          checkInWindowOpens: classSchedule.checkInStart
        });
      }

      if (checkInDate > classSchedule.checkInEnd) {
        return res.status(400).json({
          message: "Check-in time cannot be after the check-in window closed",
          checkInWindowCloses: classSchedule.checkInEnd
        });
      }
    }

    // Validate check-out time if provided
    if (checkOutTime) {
      const checkOutDate = new Date(checkOutTime);
      
      if (checkOutDate > now) {
        return res.status(400).json({
          message: "Check-out time cannot be in the future"
        });
      }

      if (checkOutDate < classSchedule.checkOutStart) {
        return res.status(400).json({
          message: "Check-out time cannot be before the check-out window opened",
          checkOutWindowOpens: classSchedule.checkOutStart
        });
      }

      if (checkInTime && checkOutDate <= new Date(checkInTime)) {
        return res.status(400).json({
          message: "Check-out time must be after check-in time"
        });
      }
    }

    next();

  } catch (error) {
    console.error("Manual attendance time validation error:", error);
    res.status(500).json({
      message: "Manual attendance validation failed",
      error: error.message
    });
  }
};