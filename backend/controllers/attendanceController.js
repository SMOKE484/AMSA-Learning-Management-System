import Attendance from "../models/attendance.js";
import ClassSchedule from "../models/classSchedule.js";
import Student from "../models/student.js";
import Tutor from "../models/tutor.js";
import SchoolConfig from "../models/schoolConfig.js";
import Card from "../models/card.js";
import { NotificationService } from "../utils/notificationService.js";
import { TimeService } from "../utils/timeService.js";

export const markStudentAttendance = async (req, res) => {
  try {
    const { classId } = req.params;
    const { studentId, status, reason } = req.body;

    const VALID_STATUSES = ['present', 'absent', 'late', 'excused'];
    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ message: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
    }

    if (!studentId) {
      return res.status(400).json({ message: 'studentId is required' });
    }

    const classSchedule = await ClassSchedule.findById(classId);
    if (!classSchedule) return res.status(404).json({ message: 'Class not found' });

    // Tutors can only mark attendance for their own classes
    if (req.role === 'tutor') {
      if (!req.tutorId || classSchedule.tutor.toString() !== req.tutorId.toString()) {
        return res.status(403).json({ message: 'You can only mark attendance for your own classes' });
      }
    }

    // Verify the student is enrolled in this class
    const isEnrolled = classSchedule.students.some(s => s.toString() === studentId.toString());
    if (!isEnrolled) {
      return res.status(403).json({ message: 'This student is not enrolled in the selected class' });
    }

    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    // Upsert: create or update attendance for this student in this class
    const existing = await Attendance.findOne({ class: classId, student: studentId });

    const attendance = await Attendance.findOneAndUpdate(
      { class: classId, student: studentId },
      {
        $set: {
          status,
          isVerified: true,
          autoMarked: false,
          notes: reason || `Marked by ${req.role}`,
          manualOverride: {
            by: req.userId,
            reason: reason || `Marked by ${req.role}`,
            timestamp: new Date(),
            originalStatus: existing?.status ?? null
          }
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    NotificationService.sendManualAttendanceNotification(studentId, classSchedule, status, req.role);

    res.json({ success: true, message: 'Attendance marked successfully', attendance });
  } catch (error) {
    console.error('markStudentAttendance error:', error);
    res.status(500).json({ message: error.message });
  }
};

export const checkIn = async (req, res) => {
  try {
    const { classId } = req.params;
    const { deviceId, location } = req.body; 

    //IP VALIDATION
    const schoolConfig = await SchoolConfig.getConfig();
    const allowedIPs = schoolConfig.allowedIPs ?? [];
    const clientIp = req.ip || req.headers['x-forwarded-for']?.split(',')[0] || req.connection.remoteAddress;
    const normalizedClient = (clientIp || '').replace('::ffff:', '').trim();

    if (allowedIPs.length > 0) {
      const isAllowed = allowedIPs.some(ip => ip.replace('::ffff:', '').trim() === normalizedClient);
      if (!isAllowed) {
        return res.status(403).json({
          success: false,
          message: "Security Alert: You must be connected to the School WiFi.",
        });
      }
    }

    //STANDARD CHECKS
    const student = await Student.findOne({ user: req.userId });
    if (!student) return res.status(404).json({ message: "Student not found" });

    const classSchedule = await ClassSchedule.findById(classId);
    if (!classSchedule) return res.status(404).json({ message: "Class not found" });

    if (!classSchedule.isCheckInAvailable()) {
      return res.status(400).json({ success: false, message: `Register is closed.` });
    }

    //FIND & UPDATE
    let attendance = await Attendance.findOne({ class: classId, student: student._id });

    if (!attendance) {
      attendance = new Attendance({ class: classId, student: student._id, status: "absent" });
    }

    if (attendance.status === 'present') {
      return res.status(400).json({ message: "Already signed in" });
    }

    attendance.status = "present";
    attendance.checkIn = {
      time: new Date(),
      ipAddress: normalizedClient,
      deviceId: deviceId || 'unknown',
      verificationMethod: 'school_ip_verified',
      verifiedByIP: true,
      location: location ? {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy
      } : undefined
    };
    attendance.isVerified = true;

    await attendance.save();

    // notify parents that their child has successfully attended the class
    NotificationService.sendAttendanceConfirmation(
      student._id, 
      classSchedule, 
      attendance.checkIn.time
    );
    

    res.json({ success: true, message: `Signed in successfully`, attendance });
  } catch (error) {
    console.error("CheckIn Error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const checkOut = async (req, res) => {
  try {
    const { classId } = req.params;
    const student = await Student.findOne({ user: req.userId });
    if (!student) return res.status(404).json({ message: "Student not found" });

    const attendance = await Attendance.findOne({ class: classId, student: student._id });
    if (!attendance || !attendance.checkIn?.time) return res.status(400).json({ message: "Not signed in" });
    if (attendance.checkOut?.time) return res.status(400).json({ message: "Already signed out" });

    attendance.checkOut = { time: new Date(), ipAddress: req.ip };
    await attendance.save();
    res.json({ success: true, message: "Signed out" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getClassAttendance = async (req, res) => {
  try {
    const { classId } = req.params;
    const student = await Student.findOne({ user: req.userId });
    if (!student) return res.status(404).json({ message: "Student not found" });
    const attendance = await Attendance.findOne({ class: classId, student: student._id }).populate('class', 'title subject startTime');
    res.json({ success: true, attendance });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAttendanceHistory = async (req, res) => {
  try {
    const student = await Student.findOne({ user: req.userId });
    if (!student) return res.status(404).json({ message: "Student not found" });
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 100);
    const history = await Attendance.find({ student: student._id })
      .populate('class', 'title subject scheduledDate')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    res.json({ success: true, history, page, limit });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAllAttendance = async (req, res) => {
  try {
    const { startDate, endDate, classId } = req.query;
    
    let query = {};
    if (classId && classId !== 'all') {
      query.class = classId;
    }
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const attendanceRecords = await Attendance.find(query)
      .populate({
        path: 'student',
        select: 'grade user', 
        populate: {
          path: 'user',
          select: 'name email'
        }
      })
      .populate({
        path: 'class',
        select: 'title subject grade scheduledDate startTime endTime'
      })
      .sort({ createdAt: -1 })
      .limit(500);

    res.json(attendanceRecords);
  } catch (error) {
    console.error("Get All Attendance Error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const getClassReport = async (req, res) => {
  try {
    const { classId } = req.params;
    const tutor = await Tutor.findOne({ user: req.userId });
    if (!tutor) return res.status(403).json({ message: "Access denied" });

    const classSchedule = await ClassSchedule.findById(classId);
    if (!classSchedule || classSchedule.tutor.toString() !== tutor._id.toString()) {
      return res.status(403).json({ message: "Access denied" });
    }

    const report = await Attendance.find({ class: classId })
      .populate({ path: 'student', select: 'user', populate: { path: 'user', select: 'name email' } });
    res.json({ success: true, report });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const markBatchAttendance = async (req, res) => {
  try {
    const { classId } = req.params;
    const { students } = req.body; // [{ studentId, status }]

    if (!Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ message: 'students must be a non-empty array' });
    }

    const VALID_STATUSES = ['present', 'absent', 'late', 'excused'];

    const classSchedule = await ClassSchedule.findById(classId);
    if (!classSchedule) return res.status(404).json({ message: 'Class not found' });

    if (req.role === 'tutor') {
      if (!req.tutorId || classSchedule.tutor.toString() !== req.tutorId.toString()) {
        return res.status(403).json({ message: 'You can only mark attendance for your own classes' });
      }
    }

    const results = await Promise.all(
      students.map(async ({ studentId, status }) => {
        if (!studentId || !VALID_STATUSES.includes(status)) {
          return { studentId, success: false, error: 'Invalid studentId or status' };
        }

        const isEnrolled = classSchedule.students.some(s => s.toString() === studentId.toString());
        if (!isEnrolled) {
          return { studentId, success: false, error: 'Student not enrolled in this class' };
        }

        try {
          const existing = await Attendance.findOne({ class: classId, student: studentId });

          await Attendance.findOneAndUpdate(
            { class: classId, student: studentId },
            {
              $set: {
                status,
                isVerified: true,
                autoMarked: false,
                notes: `Marked by ${req.role}`,
                manualOverride: {
                  by: req.userId,
                  reason: `Marked by ${req.role}`,
                  timestamp: new Date(),
                  originalStatus: existing?.status ?? null
                }
              }
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );

          NotificationService.sendManualAttendanceNotification(studentId, classSchedule, status, req.role);

          return { studentId, success: true };
        } catch (err) {
          return { studentId, success: false, error: err.message };
        }
      })
    );

    const saved = results.filter(r => r.success).length;
    const errors = results.filter(r => !r.success);

    res.json({ success: true, saved, errors, results });
  } catch (error) {
    console.error('markBatchAttendance error:', error);
    res.status(500).json({ message: error.message });
  }
};

// NFC tap-attendance: admin/staff phone reads a card's token off a physical tag
// and posts it here to sign the register for whichever class is currently active
// for that student.
export const nfcTapAttendance = async (req, res) => {
  try {
    const { cardToken, classId } = req.body;
    if (!cardToken) {
      return res.status(400).json({ message: "cardToken is required" });
    }

    const card = await Card.findOne({ token: cardToken }).populate({
      path: "student",
      populate: { path: "user", select: "name" },
    });

    if (!card) {
      return res.status(404).json({ message: "Card not recognized", reason: "unknown" });
    }
    if (card.status !== "active") {
      return res.status(404).json({ message: "This card has been revoked", reason: "revoked" });
    }

    const student = card.student;
    if (!student) {
      return res.status(404).json({ message: "Student not found for this card", reason: "unknown" });
    }

    const now = new Date();

    let classSchedule;
    if (classId) {
      classSchedule = await ClassSchedule.findById(classId);
      if (!classSchedule || !classSchedule.students.some(s => s.toString() === student._id.toString())) {
        return res.status(404).json({ message: "Student is not enrolled in the selected class" });
      }
    } else {
      const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(now); endOfDay.setHours(23, 59, 59, 999);

      const candidates = await ClassSchedule.find({
        students: student._id,
        scheduledDate: { $gte: startOfDay, $lte: endOfDay },
      });

      const inWindow = candidates.filter(c => {
        if (!c.classStartTime || !c.classEndTime) return false;
        const windowStart = new Date(c.classStartTime.getTime() - 30 * 60000);
        return now >= windowStart && now <= c.classEndTime;
      });

      if (inWindow.length === 0) {
        return res.status(404).json({ message: "No active class found for this student right now" });
      }
      if (inWindow.length > 1) {
        return res.status(409).json({
          message: "Multiple active classes found for this student — please select one",
          classes: inWindow.map(c => ({ _id: c._id, title: c.title, subject: c.subject, startTime: c.startTime })),
        });
      }
      classSchedule = inWindow[0];
    }

    const existing = await Attendance.findOne({ class: classSchedule._id, student: student._id });
    if (existing?.checkIn?.time) {
      return res.json({
        success: true,
        alreadyMarked: true,
        student: { name: student.user?.name, photoUrl: student.photoUrl, grade: student.grade },
        class: { title: classSchedule.title, subject: classSchedule.subject, startTime: classSchedule.startTime },
        status: existing.status,
        checkInTime: existing.checkIn.time,
      });
    }

    const schoolConfig = await SchoolConfig.getConfig();
    const graceMinutes = schoolConfig.nfcLateGraceMinutes ?? 15;
    const status = TimeService.getNfcTapStatus(now, classSchedule.classEndTime, graceMinutes);

    const attendance = await Attendance.findOneAndUpdate(
      { class: classSchedule._id, student: student._id },
      {
        $set: {
          status,
          isVerified: true,
          autoMarked: false,
          checkIn: {
            time: now,
            verificationMethod: "nfc",
            card: card._id,
            markedBy: req.userId,
          },
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    card.lastTapAt = now;
    await card.save();

    NotificationService.sendManualAttendanceNotification(student._id, classSchedule, status, req.role, attendance.checkIn.time);

    res.json({
      success: true,
      alreadyMarked: false,
      student: { name: student.user?.name, photoUrl: student.photoUrl, grade: student.grade },
      class: { title: classSchedule.title, subject: classSchedule.subject, startTime: classSchedule.startTime },
      status,
      checkInTime: attendance.checkIn.time,
    });
  } catch (error) {
    console.error("nfcTapAttendance error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const manualOverride = async (req, res) => {
  try {
    const { attendanceId } = req.params;
    const { status, reason } = req.body;
    const attendance = await Attendance.findById(attendanceId);
    if (!attendance) return res.status(404).json({ message: "Record not found" });

    attendance.status = status;
    attendance.manualOverride = { by: req.userId, reason, timestamp: new Date() };
    attendance.isVerified = true;
    await attendance.save();
    res.json({ success: true, message: "Attendance updated manually" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
