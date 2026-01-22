import ClassSchedule from "../models/classSchedule.js";
import Attendance from "../models/attendance.js";
import Student from "../models/student.js";
import Tutor from "../models/tutor.js";
import { sendClassNotification } from "../utils/notificationService.js";

// Helper: Create initial "Absent" records
const createAttendanceRecords = async (classId, studentIds) => {
  if (!studentIds || studentIds.length === 0) return;
  const attendanceRecords = studentIds.map(studentId => ({
    class: classId, student: studentId, status: "absent", isVerified: false
  }));
  try {
    await Attendance.insertMany(attendanceRecords, { ordered: false });
  } catch (error) { if (error.code !== 11000) console.error("Error creating attendance:", error); }
};

export const createSchedule = async (req, res) => {
  try {
    const {
      subject, grade, title, description, scheduledDate, startTime, endTime,
      students, meetingLink, room, recurrence, tutor, autoAssignStudents = true
    } = req.body;

    if (!subject || !grade || !title || !scheduledDate || !startTime || !endTime) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    let tutorId;
    if (req.role === "admin") {
      if (!tutor) return res.status(400).json({ message: "Tutor ID required for admin" });
      tutorId = tutor;
    } else {
      // Find Tutor ID from User ID
      const tutorObj = await Tutor.findOne({ user: req.userId });
      if(!tutorObj) return res.status(403).json({ message: "Tutor profile not found" });
      tutorId = tutorObj._id;
    }

    let assignedStudents = students || [];
    if (autoAssignStudents && (!students || students.length === 0)) {
      const eligibleStudents = await Student.find({ grade: grade.toString(), subjects: subject }).select('_id');
      assignedStudents = eligibleStudents.map(student => student._id);
    }

    const classSchedule = new ClassSchedule({
      tutor: tutorId, subject, grade: grade.toString(), title, description,
      scheduledDate: new Date(scheduledDate), startTime, endTime,
      students: assignedStudents, meetingLink, room, recurrence,
      createdBy: req.userId, status: "scheduled", autoAssigned: autoAssignStudents && assignedStudents.length > 0
    });

    const savedSchedule = await classSchedule.save();

    if (assignedStudents.length > 0) {
      await createAttendanceRecords(savedSchedule._id, assignedStudents);
      
      // === NOTIFICATION TRIGGER ===
      // This function has been updated in the service to notify parents as well
      sendClassNotification(assignedStudents, savedSchedule);
    }

    res.status(201).json({ message: "Class created", class: savedSchedule });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getSchedules = async (req, res) => {
  try {
    const { tutorId, studentId, subject, grade, startDate, endDate, status, page = 1, limit = 10 } = req.query;
    const filter = {};
    if (tutorId) filter.tutor = tutorId;
    if (studentId) filter.students = studentId;
    if (subject) filter.subject = subject;
    if (grade) filter.grade = grade;
    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.scheduledDate = {};
      if (startDate) filter.scheduledDate.$gte = new Date(startDate);
      if (endDate) filter.scheduledDate.$lte = new Date(endDate);
    }

    const schedules = await ClassSchedule.find(filter)
      .populate("tutor", "user").populate("students", "user grade")
      .sort({ scheduledDate: 1 }).skip((page - 1) * limit).limit(parseInt(limit));
    const total = await ClassSchedule.countDocuments(filter);

    res.json({ schedules, pagination: { page: parseInt(page), limit: parseInt(limit), total } });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const updateSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const classSchedule = await ClassSchedule.findById(id);
    if (!classSchedule) return res.status(404).json({ message: "Class not found" });

    if (updates.subject || updates.grade) {
       // Re-run auto assign logic if needed
       // ... (Simplified: assume frontend handles this or updates students array)
    }

    Object.keys(updates).forEach(key => { if (key !== "students") classSchedule[key] = updates[key]; });
    if (updates.students) {
      classSchedule.students = updates.students;
      // Sync attendance
      // Logic to add attendance for new students would typically go here
    }
    await classSchedule.save();
    res.json({ message: "Class updated", class: classSchedule });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const deleteSchedule = async (req, res) => {
    try {
        const { id } = req.params;
        await ClassSchedule.findByIdAndDelete(id);
        res.json({ message: "Class deleted" });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

export const getUpcomingClasses = async (req, res) => {
    try {
        let upcomingClasses = [];
        if (req.role === "student") {
            const student = await Student.findOne({ user: req.userId });
            if(student) upcomingClasses = await ClassSchedule.findUpcomingForStudent(student._id);
        } else if (req.role === "tutor") {
            const tutor = await Tutor.findOne({ user: req.userId });
            if(tutor) upcomingClasses = await ClassSchedule.find({ tutor: tutor._id, scheduledDate: { $gte: new Date() } }).limit(10);
        }
        res.json({ upcomingClasses });
    } catch (error) { res.status(500).json({ message: error.message }); }
};
