import User from "../models/user.js";
import Student from "../models/student.js";
import Tutor from "../models/tutor.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Email and password required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid email or password" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid email or password" });

    const token = jwt.sign(
      { userId: user._id, role: user.role, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Fetch role-specific ID
    let roleId = null;
    if (user.role === 'student') {
        const student = await Student.findOne({ user: user._id });
        roleId = student ? student._id : null;
    } else if (user.role === 'tutor') {
        const tutor = await Tutor.findOne({ user: user._id });
        roleId = tutor ? tutor._id : null;
    }

    res.json({
      message: "Login successful",
      token,
      user: { id: user._id, roleId, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error during login" });
  }
};

export const updatePushToken = async (req, res) => {
  try {
    const { pushToken } = req.body;
    if (!pushToken) return res.status(400).json({ message: "Token required" });

    await User.findByIdAndUpdate(req.userId, { pushToken });
    res.json({ success: true, message: "Push token updated" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const logout = (req, res) => {
  res.json({ message: "Logout successful" });
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ message: "Fields required" });
    if (newPassword.length < 6) return res.status(400).json({ message: "Password too short" });

    const user = await User.findById(req.userId);
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(401).json({ message: "Current password incorrect" });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};