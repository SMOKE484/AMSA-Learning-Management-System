import Student from "../models/student.js";
import Mark from "../models/mark.js";
import User from "../models/user.js";
import Attendance from "../models/attendance.js";

// Get parent profile
export const getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all children linked to this parent
export const getMyChildren = async (req, res) => {
  try {
    // req.userId is the parent's User ID
    const children = await Student.find({ parents: req.userId }).populate(
      "user",
      "name email"
    );

    res.status(200).json({ children });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get attendance rate for all linked children
export const getMyChildrenAttendance = async (req, res) => {
  try {
    const children = await Student.find({ parents: req.userId }).select('_id');
    if (!children.length) return res.status(200).json({ rate: 0, total: 0, present: 0 });

    const childrenIds = children.map(c => c._id);

    // Count in the database instead of loading every attendance document
    const [counts] = await Attendance.aggregate([
      { $match: { student: { $in: childrenIds } } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          present: { $sum: { $cond: [{ $in: ["$status", ["present", "late"]] }, 1, 0] } },
        },
      },
    ]);

    const total = counts?.total ?? 0;
    const present = counts?.present ?? 0;
    const rate = total > 0 ? Math.round((present / total) * 100) : 0;

    res.status(200).json({ rate, total, present });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get detailed attendance records for all linked children
export const getMyChildrenAttendanceRecords = async (req, res) => {
  try {
    const children = await Student.find({ parents: req.userId }).select('_id');
    if (!children.length) return res.status(200).json({ records: [] });

    const childrenIds = children.map(c => c._id);
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 100);

    const records = await Attendance.find({ student: { $in: childrenIds } })
      .populate({ path: 'student', select: 'user grade', populate: { path: 'user', select: 'name' } })
      .populate({ path: 'class', select: 'subject scheduledDate grade' })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.status(200).json({ records, page, limit });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all marks for all linked children
export const getMyChildrenMarks = async (req, res) => {
  try {
    // 1. Find all children linked to this parent (req.userId)
    const children = await Student.find({ parents: req.userId }).select("_id");

    if (!children.length) {
      return res.status(200).json({ marks: [] }); // No children, no marks
    }

    // 2. Extract just the IDs
    const childrenIds = children.map((child) => child._id);

    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 100, 1), 200);

    // 3. Find all marks where the 'student' is in our list of children IDs
    const marks = await Mark.find({ student: { $in: childrenIds } })
      .populate({ path: "student", select: "user grade", populate: { path: "user", select: "name" } })
      .populate({ path: "tutor", select: "user", populate: { path: "user", select: "name" } })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.status(200).json({ marks, page, limit });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};