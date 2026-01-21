import Student from "../models/student.js";
import Note from "../models/notes.js";
import Mark from "../models/mark.js";
import { invalidateStudentCache } from "../middleware/cacheMiddleware.js";

// Get student profile
export const getMyProfile = async (req, res) => {
  try {
    const student = await Student.findOne({ user: req.userId }).populate(
      "user",
      "name email"
    );
    if (!student) return res.status(404).json({ message: "Student not found" });

    res.json({ student });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get student attendance
export const getAttendance = async (req, res) => {
  try {
    const student = await Student.findOne({ user: req.userId });
    if (!student) return res.status(404).json({ message: "Student not found" });

    res.json({ attendance: student.attendance || [] });
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
      .populate("tutor", "user")
      .populate("tutor.user", "name")
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

    const marks = await Mark.find({ student: student._id })
      .populate("tutor", "user")
      .populate("tutor.user", "name")
      .sort({ createdAt: -1 });

    res.status(200).json({ marks });
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