import Attendance from "../models/Attendance.js";
import ClassSchedule from "../models/classSchedule.js";
import Student from "../models/student.js";
import Tutor from "../models/tutor.js";
import { NotificationService } from "../utils/notificationService.js";

export const checkIn = async (req, res) => {
  try {
    const { classId } = req.params;
    const { deviceId, location } = req.body; 

    //IP VALIDATION
    const clientIp = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const ALLOWED_IP = process.env.SCHOOL_PUBLIC_IP; 
    const normalizedClient = clientIp ? clientIp.replace('::ffff:', '') : '';
    const normalizedAllowed = ALLOWED_IP ? ALLOWED_IP.replace('::ffff:', '') : '';

    if (normalizedAllowed && normalizedClient !== normalizedAllowed) {
      return res.status(403).json({ 
        success: false,
        message: "Security Alert: You must be connected to the School WiFi.",
      });
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
    const attendance = await Attendance.findOne({ class: classId, student: student._id }).populate('class', 'title subject startTime');
    res.json({ success: true, attendance });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAttendanceHistory = async (req, res) => {
  try {
    const student = await Student.findOne({ user: req.userId });
    const history = await Attendance.find({ student: student._id }).populate('class', 'title subject scheduledDate').sort({ createdAt: -1 });
    res.json({ success: true, history });
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
    
    const classSchedule = await ClassSchedule.findById(classId);
    if (!classSchedule || classSchedule.tutor.toString() !== tutor._id.toString()) {
      return res.status(403).json({ message: "Access denied" });
    }

    const report = await Attendance.find({ class: classId }).populate('student', 'user').populate('student.user', 'name email');
    res.json({ success: true, report });
  } catch (error) {
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