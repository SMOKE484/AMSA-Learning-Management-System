import crypto from 'crypto';
import User from "../models/user.js";
import Student from "../models/student.js";
import Tutor from "../models/tutor.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { sendOTPEmail } from "../utils/emailService.js";

const hashOTP = (otp) => crypto.createHash('sha256').update(otp).digest('hex');
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();
const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes

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
      user: {
        id: user._id,
        roleId,
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error during login" });
  }
};

export const sendVerificationEmail = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.emailVerified) return res.status(400).json({ message: "Email already verified" });

    const otp = generateOTP();
    user.emailVerificationOTP = hashOTP(otp);
    user.emailVerificationExpiry = new Date(Date.now() + OTP_TTL_MS);
    await user.save();

    await sendOTPEmail(user.email, user.name, otp, 'verification');
    res.json({ message: "Verification code sent to your email" });
  } catch (error) {
    console.error("Send verification email error:", error);
    res.status(500).json({ message: "Failed to send verification email" });
  }
};

export const verifyEmail = async (req, res) => {
  try {
    const { otp } = req.body;
    if (!otp) return res.status(400).json({ message: "OTP required" });

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.emailVerified) return res.status(400).json({ message: "Email already verified" });

    if (!user.emailVerificationOTP || !user.emailVerificationExpiry) {
      return res.status(400).json({ message: "No verification code found. Request a new one." });
    }
    if (new Date() > user.emailVerificationExpiry) {
      return res.status(400).json({ message: "Verification code expired. Request a new one." });
    }
    if (hashOTP(otp) !== user.emailVerificationOTP) {
      return res.status(400).json({ message: "Invalid verification code" });
    }

    user.emailVerified = true;
    user.emailVerificationOTP = null;
    user.emailVerificationExpiry = null;
    await user.save();

    res.json({ message: "Email verified successfully" });
  } catch (error) {
    console.error("Verify email error:", error);
    res.status(500).json({ message: "Server error during verification" });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email required" });

    const user = await User.findOne({ email });

    // Always return the same message to prevent email enumeration
    const successMsg = { message: "If that email is registered, a reset code has been sent" };

    if (!user) return res.json(successMsg);

    const otp = generateOTP();
    user.passwordResetOTP = hashOTP(otp);
    user.passwordResetExpiry = new Date(Date.now() + OTP_TTL_MS);
    await user.save();

    await sendOTPEmail(user.email, user.name, otp, 'password-reset');
    res.json(successMsg);
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const verifyResetOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ message: "Email and OTP required" });

    const user = await User.findOne({ email });
    if (!user || !user.passwordResetOTP || !user.passwordResetExpiry) {
      return res.status(400).json({ message: "Invalid or expired reset code" });
    }
    if (new Date() > user.passwordResetExpiry) {
      return res.status(400).json({ message: "Reset code expired. Request a new one." });
    }
    if (hashOTP(otp) !== user.passwordResetOTP) {
      return res.status(400).json({ message: "Invalid reset code" });
    }

    // Issue a short-lived reset token
    const resetToken = jwt.sign(
      { userId: user._id, purpose: 'password-reset' },
      process.env.JWT_SECRET,
      { expiresIn: '10m' }
    );

    res.json({ resetToken });
  } catch (error) {
    console.error("Verify reset OTP error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;
    if (!resetToken || !newPassword) return res.status(400).json({ message: "Fields required" });
    if (newPassword.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters" });

    let payload;
    try {
      payload = jwt.verify(resetToken, process.env.JWT_SECRET);
    } catch {
      return res.status(400).json({ message: "Reset token invalid or expired" });
    }

    if (payload.purpose !== 'password-reset') {
      return res.status(400).json({ message: "Invalid reset token" });
    }

    const user = await User.findById(payload.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.password = await bcrypt.hash(newPassword, 10);
    user.passwordResetOTP = null;
    user.passwordResetExpiry = null;
    await user.save();

    res.json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const updatePushToken = async (req, res) => {
  try {
    const { pushToken } = req.body;
    await User.findByIdAndUpdate(req.userId, { pushToken: pushToken || null });
    res.json({ success: true, message: pushToken ? "Push token updated" : "Push token cleared" });
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
