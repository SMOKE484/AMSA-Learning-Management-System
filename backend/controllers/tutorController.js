import Tutor from "../models/tutor.js";
import Note from "../models/notes.js";
import Student from "../models/student.js";
import Mark from "../models/mark.js";
import { 
  invalidateNotesCache, 
  invalidateMarksCache, 
  invalidateStudentCache 
} from "../middleware/cacheMiddleware.js";
import { NotificationService } from "../utils/notificationService.js";
import fs from "fs";
import { uploadToS3 } from "../utils/s3Service.js";

// Get tutor profile
export const getMyProfile = async (req, res) => {
  try {
    const tutor = await Tutor.findOne({ user: req.userId }).populate(
      "user",
      "name email"
    );
    if (!tutor) return res.status(404).json({ message: "Tutor not found" });

    res.json({ tutor });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Add student attendance
export const addAttendance = async (req, res) => {
  try {
    const { status } = req.body;
    const { studentId } = req.params;
    
    const tutor = await Tutor.findOne({ user: req.userId });
    if (!tutor) return res.status(404).json({ message: "Tutor not found" });

    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ message: "Student not found" });

    // Verify student is in tutor's grade and subjects
    if (student.grade !== tutor.grade && !tutor.grades.includes(student.grade)) { 
      return res.status(403).json({ 
        message: "You can only add attendance for students in your assigned grade" 
      });
    }

    const hasCommonSubject = student.subjects.some(subject => 
      tutor.subjects.includes(subject)
    );
    
    if (!hasCommonSubject) {
      return res.status(403).json({ 
        message: "Student is not enrolled in any of your subjects" 
      });
    }

    student.attendance.push({ date: new Date(), status: status || "present" });
    await student.save();

    await invalidateStudentCache(studentId);

    res.json({ message: "Attendance added", attendance: student.attendance });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// === UPLOAD NOTE (DIRECT S3 UPLOAD) ===
export const uploadNote = async (req, res) => {
  try {
    const { title, description, subject, grade } = req.body;

    // 1. Basic Validation
    if (!req.file) {
      return res.status(400).json({ message: "No PDF file uploaded" });
    }

    // Cleanup helper: deletes file if validation fails
    const cleanupLocalFile = () => {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
    };

    if (!title || !subject || !grade) {
      cleanupLocalFile();
      return res.status(400).json({ message: "Title, Subject, and Grade are required" });
    }

    const tutor = await Tutor.findOne({ user: req.userId });
    if (!tutor) {
      cleanupLocalFile();
      return res.status(404).json({ message: "Tutor not found" });
    }

    // 2. Permission Validation
    if (!tutor.subjects.includes(subject)) {
      cleanupLocalFile();
      return res.status(403).json({
        message: "You can only upload notes for your assigned subjects",
      });
    }

    if (!tutor.grades.includes(grade)) {
      cleanupLocalFile();
      return res.status(403).json({ 
        message: "You can only upload notes for one of your assigned grades" 
      });
    }

    // 3. Upload directly to AWS S3
    let s3Url;
    try {
      console.log("Uploading file to S3...");
      s3Url = await uploadToS3(
        req.file.path, 
        req.file.filename, 
        "application/pdf"
      );
    } catch (uploadError) {
      cleanupLocalFile();
      return res.status(500).json({ message: "Failed to upload to cloud storage" });
    }

    // 4. Cleanup Local File (We deleted it because it's safe in S3 now)
    cleanupLocalFile();

    // 5. Create Database Record
    const note = await Note.create({
      title,
      description,
      fileUrl: s3Url, // The S3 URL
      tutor: tutor._id,
      subject,
      grade,
    });

    // 6. Send Notifications
    const studentsToNotify = await Student.find({ 
      grade: grade, 
      subjects: subject 
    }).select('_id');
    const studentIds = studentsToNotify.map(s => s._id);
    
    NotificationService.sendNoteNotification(studentIds, note);

    // 7. Invalidate Cache
    await invalidateNotesCache();

    res.status(201).json({ message: "Note uploaded successfully", note });
  } catch (error) {
    // Final safety cleanup in case of crash
    if (req.file && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch(e) {}
    }
    res.status(500).json({ message: error.message });
  }
};

// Get all notes created by this tutor
export const getTutorNotes = async (req, res) => {
  try {
    const tutor = await Tutor.findOne({ user: req.userId });
    if (!tutor) return res.status(404).json({ message: "Tutor not found" });

    const notes = await Note.find({ tutor: tutor._id })
      .populate("tutor", "user")
      .sort({ createdAt: -1 });
    
    res.json({ notes });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get assigned students for the authenticated tutor
export const getAssignedStudents = async (req, res) => {
  try {
    const { grade, subject } = req.query;

    const tutor = await Tutor.findOne({ user: req.userId });
    if (!tutor) {
      return res.status(404).json({ message: "Tutor not found" });
    }

    const targetGrade = grade || { $in: tutor.grades }; 
    const targetSubject = subject || { $in: tutor.subjects };

    if (subject && !tutor.subjects.includes(subject)) {
      return res
        .status(403)
        .json({ message: "You are not assigned to this subject" });
    }

    if (grade && !tutor.grades.includes(grade)) { 
      return res
        .status(403)
        .json({ message: "You are not assigned to this grade" });
    }

    const filter = {
      grade: targetGrade,
      subjects: targetSubject,
    };

    const students = await Student.find(filter).populate("user", "name email");

    res.status(200).json({ 
      students,
      filter: {
        grade: targetGrade,
        subject: targetSubject
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Upload marks for students in the tutor's grade & subject
export const uploadMarks = async (req, res) => {
  try {
    const { grade, subject, testName, marks } = req.body;

    if (!grade || !subject || !testName || !marks || !Array.isArray(marks)) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const tutor = await Tutor.findOne({ user: req.userId });
    if (!tutor) return res.status(404).json({ message: "Tutor not found" });

    if (!tutor.subjects.includes(subject) || !tutor.grades.includes(grade)) {
      return res.status(403).json({
        message: "You are not allowed to upload marks for this grade or subject",
      });
    }

    const allowedStudents = await Student.find({
      grade,
      subjects: subject,
    }).select("_id name user");

    const allowedIds = allowedStudents.map((s) => s._id.toString());

    const invalidStudents = [];
    for (const m of marks) {
      if (!allowedIds.includes(m.studentId)) {
        invalidStudents.push(m.studentId);
      }
    }

    if (invalidStudents.length > 0) {
      return res.status(403).json({
        message: `Some students are not in this grade or subject`,
        invalidStudents
      });
    }

    const createdMarks = await Mark.insertMany(
      marks.map((m) => ({
        student: m.studentId,
        tutor: tutor._id,
        subject,
        grade,
        testName,
        score: m.score,
        total: m.total,
      }))
    );

    const studentIds = marks.map(m => m.studentId);
    
    NotificationService.sendMarksNotification(studentIds, {
      subject,
      testName
    });

    await invalidateMarksCache();

    res
      .status(201)
      .json({ message: "Marks uploaded successfully", createdMarks });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};  


//Get Marks for Tutor's Subjects/Grades
export const getTutorStudentMarks = async (req, res) => {
  try {
    const tutor = await Tutor.findOne({ user: req.userId });
    if (!tutor) return res.status(404).json({ message: "Tutor not found" });

    const { grade, subject } = req.query;

    //Ensure Tutor can only see marks for their allowed subjects/grades
    const query = {
      subject: { $in: tutor.subjects },
      grade: { $in: tutor.grades }
    };

    // Apply filters if provided (and if they are valid for this tutor)
    if (grade && tutor.grades.includes(grade)) query.grade = grade;
    if (subject && tutor.subjects.includes(subject)) query.subject = subject;

    const marks = await Mark.find(query)
      .populate("student", "user")
      .populate({
        path: "student",
        populate: { path: "user", select: "name" }
      })
      .sort({ createdAt: -1 });

    res.json({ marks });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//Tutor can edit THEIR OWN uploads 
export const updateTutorMark = async (req, res) => {
  try {
    const { markId } = req.params;
    const { score } = req.body;
    const tutor = await Tutor.findOne({ user: req.userId });

    // Find mark and ensure this tutor owns it
    const mark = await Mark.findOne({ _id: markId, tutor: tutor._id });
    if (!mark) return res.status(404).json({ message: "Mark not found or unauthorized" });

    mark.score = score;
    await mark.save();

    res.json({ message: "Mark updated", mark });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};