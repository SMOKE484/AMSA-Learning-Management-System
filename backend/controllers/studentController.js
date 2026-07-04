import Student from "../models/student.js";
import Note from "../models/notes.js";
import Mark from "../models/mark.js";
import Attendance from "../models/attendance.js";
import { invalidateStudentCache } from "../middleware/cacheMiddleware.js";

// Get student profile
export const getMyProfile = async (req, res) => {
  try {
    console.log('[getMyProfile] req.userId:', req.userId, '| req.role:', req.role);

    const student = await Student.findOne({ user: req.userId }).populate(
      "user",
      "name email"
    );

    console.log('[getMyProfile] student lookup result:', student
      ? { _id: student._id, grade: student.grade, user: student.user?._id }
      : 'NOT FOUND — no Student record for this userId'
    );

    if (!student) return res.status(404).json({ message: "Student not found" });

    console.log('[getMyProfile] returning student profile for:', student.user?.email);
    res.json({ student });
  } catch (error) {
    console.error('[getMyProfile] error:', error.message, error.stack);
    res.status(500).json({ message: error.message });
  }
};

// Get student attendance
export const getAttendance = async (req, res) => {
  try {
    const student = await Student.findOne({ user: req.userId });
    if (!student) return res.status(404).json({ message: "Student not found" });

    const attendance = await Attendance.find({ student: student._id })
      .populate("class", "title subject scheduledDate")
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({ attendance });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Fetch notes assigned to the student based on Subject
export const getStudentNotes = async (req, res) => {
  try {
    const student = await Student.findOne({ user: req.userId });
    if (!student) return res.status(404).json({ message: "Student not found" });

    const notes = await Note.find({
      subject: { $in: student.subjects },
      grade: student.grade
    })
      .populate({ path: "tutor", select: "user", populate: { path: "user", select: "name" } })
      .sort({ createdAt: -1 });

    res.status(200).json({ notes });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all marks for the authenticated student
export const getMyMarks = async (req, res) => {
  try {
    const student = await Student.findOne({ user: req.userId });
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 100, 1), 200);

    const marks = await Mark.find({ student: student._id })
      .populate({ path: "tutor", select: "user", populate: { path: "user", select: "name" } })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.status(200).json({ marks, page, limit });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getEligibleStudentsCount = async (req, res) => {
  try {
    const { subject, grade } = req.query;
    
    if (!subject || !grade) {
      return res.status(400).json({ 
        message: "Subject and grade are required" 
      });
    }

    const count = await Student.countDocuments({
      grade: grade.toString(),
      subjects: subject
    });

    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};