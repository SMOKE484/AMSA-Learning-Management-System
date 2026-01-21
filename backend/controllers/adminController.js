import User from "../models/user.js";
import Student from "../models/student.js";
import Tutor from "../models/tutor.js";
import Mark from "../models/mark.js";
import bcrypt from "bcryptjs";
import { invalidateTutorCache } from "../middleware/cacheMiddleware.js";
import { PREDEFINED_SUBJECTS, PREDEFINED_GRADES } from "../config/academicConfig.js";

// Create Student with linked User
export const createStudent = async (req, res) => {
  try {
    
    const { name, email, password, grade, subjects, parentIds } = req.body;

    if (!name || !email || !password || !grade || !subjects) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (!PREDEFINED_GRADES.includes(grade)) {
      return res.status(400).json({ 
        message: `Invalid grade. Must be one of: ${PREDEFINED_GRADES.join(', ')}` 
      });
    }

    const invalidSubjects = subjects.filter(subject => 
      !PREDEFINED_SUBJECTS.includes(subject)
    );

    if (invalidSubjects.length > 0) {
      return res.status(400).json({ 
        message: `Invalid subjects: ${invalidSubjects.join(', ')}` 
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Create User first
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "student",
    });

    // Create Student linked to User
    const student = await Student.create({
      user: user._id,
      grade,
      subjects,
      parents: parentIds || [],
    });

    // Invalidate tutor's student list cache so they see the new student
    await invalidateTutorCache();

    res.status(201).json({ message: "Student created successfully", student });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // Try to delete from User collection first
    const deletedUser = await User.findByIdAndDelete(userId);
    if (!deletedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Delete linked Tutor or Student records
    await Tutor.deleteOne({ user: userId });
    await Student.deleteOne({ user: userId });

    res
      .status(200)
      .json({ message: "User and linked records deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create Tutor with linked User
export const createTutor = async (req, res) => {
  try {

    const { name, email, password, subjects, grades } = req.body;

    if (!name || !email || !password || !subjects || !grades || !Array.isArray(grades)) {
      return res.status(400).json({ message: "All fields are required, and grades must be an array" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Create User first
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "tutor",
    });

    // Create Tutor linked to User
    const tutor = await Tutor.create({
      user: user._id,
      subjects,
      grades, 
    });

    res.status(201).json({ message: "Tutor created successfully", tutor });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create Parent User
export const createParent = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Create User with "parent" role
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "parent",
    });

    res.status(201).json({ message: "Parent created successfully", user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Link an existing Parent to an existing Student
export const linkParentToStudent = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { parentId } = req.body;

    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ message: "Student not found" });

    const parent = await User.findById(parentId);
    if (!parent || parent.role !== "parent") {
      return res.status(404).json({ message: "Parent user not found" });
    }

    // Add parent if not already linked
    if (!student.parents.includes(parentId)) {
      student.parents.push(parentId);
      await student.save();
    }
    
    res.status(200).json({ message: "Parent linked successfully", student });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get parent by ID with their linked students
export const getParentWithStudents = async (req, res) => {
  try {
    const { parentId } = req.params;
    
    const parent = await User.findById(parentId).select('-password');
    if (!parent || parent.role !== 'parent') {
      return res.status(404).json({ message: 'Parent not found' });
    }

    // Find all students linked to this parent
    const students = await Student.find({ parents: parentId })
      .populate('user', 'name email')
      .select('grade subjects user');

    res.json({ 
      parent: {
        ...parent.toObject(),
        linkedStudents: students
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



// List all students (Admin only)
export const listStudents = async (req, res) => {
  try {
    const students = await Student.find().populate("user", "name email");
    res.json({ students });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// List all tutors (Admin only)
export const listTutors = async (req, res) => {
  try {
    const tutors = await Tutor.find().populate("user", "name email");
    res.json({ tutors });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const listParents = async (req, res) => {
  try {
    const parents = await User.find({ role: 'parent' }).select('-password');
    res.json({ parents });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


//Get Marks with Filtering & Sorting 
export const getAllMarks = async (req, res) => {
  try {
    const { grade, subject, studentId, minScore, sortBy, limit } = req.query;

    // 1. Build Dynamic Query
    const query = {};
    if (grade) query.grade = grade;
    if (subject) query.subject = subject;
    if (studentId) query.student = studentId;
    if (minScore) query.score = { $gte: Number(minScore) }; // Good for finding distinction students

    // 2. Determine Sorting (Default to newest)
    let sortOptions = { createdAt: -1 };
    if (sortBy === 'highest') sortOptions = { score: -1 }; // Top performers
    if (sortBy === 'lowest') sortOptions = { score: 1 };   // Students needing help

    // 3. Execute Query
    const marks = await Mark.find(query)
      .populate("student", "user")
      .populate({
        path: "student",
        populate: { path: "user", select: "name email" }
      })
      .populate("tutor", "user")
      .sort(sortOptions)
      .limit(Number(limit) || 100); // Prevent massive payloads

    // 4. Calculate Statistics 
    const totalMarks = marks.length;
    const average = totalMarks > 0 
      ? (marks.reduce((acc, curr) => acc + curr.score, 0) / totalMarks).toFixed(1) 
      : 0;

    res.json({ 
      meta: { count: totalMarks, averageScore: average },
      marks 
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Admin can delete any mark 
export const deleteMark = async (req, res) => {
  try {
    const { markId } = req.params;
    await Mark.findByIdAndDelete(markId);
    res.json({ message: "Mark deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Admin can update a mark
export const updateMark = async (req, res) => {
  try {
    const { markId } = req.params;
    const { score, total } = req.body;

    const mark = await Mark.findByIdAndUpdate(
      markId, 
      { score, total },
      { new: true }
    );
    
    res.json({ message: "Mark updated", mark });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};