import Student from "../models/student.js";
import Mark from "../models/mark.js";
import User from "../models/user.js";

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

    // 3. Find all marks where the 'student' is in our list of children IDs
    const marks = await Mark.find({ student: { $in: childrenIds } })
      .populate("student", "user") // Populate student info
      .populate({
        // Nested populate to get student's name
        path: "student",
        populate: {
          path: "user",
          select: "name",
        },
      })
      .populate("tutor", "user") // Populate tutor info
      .populate({
        // Nested populate to get tutor's name
        path: "tutor",
        populate: {
          path: "user",
          select: "name",
        },
      })
      .sort({ createdAt: -1 });

    res.status(200).json({ marks });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};