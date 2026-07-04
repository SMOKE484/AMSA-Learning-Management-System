import jwt from "jsonwebtoken";
import User from "../models/user.js";
import Tutor from "../models/tutor.js";
import Student from "../models/student.js";

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.header("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Access denied. No token provided." });
    }

    const token = authHeader.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ message: "Access denied. No token provided." });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    }
    catch (jwtError) {
      if (jwtError.name === "JsonWebTokenError") {
        return res.status(401).json({ message: "Invalid token." });
      }
      if (jwtError.name === "TokenExpiredError") {
        return res.status(401).json({ message: "Token expired." });
      }
      throw jwtError;
    }

    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return res.status(401).json({ message: "Token invalid. User not found." });
    }

    req.user = user;
    req.userId = user._id;
    req.role = user.role;

    // Role-specific profile IDs: prefer the claim baked into the token at login
    // (saves a DB query on every request); fall back to a lookup for old tokens.
    if (user.role === "tutor") {
      if (decoded.roleId) {
        req.tutorId = decoded.roleId;
      } else {
        const tutor = await Tutor.findOne({ user: user._id }).select("_id").lean();
        if (tutor) req.tutorId = tutor._id;
      }
    } else if (user.role === "student") {
      if (decoded.roleId) {
        req.studentId = decoded.roleId;
      } else {
        const student = await Student.findOne({ user: user._id }).select("_id").lean();
        if (student) req.studentId = student._id;
      }
    }

    next();

  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Invalid token." });
    }
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired." });
    }

    console.error('Unexpected auth error:', error);
    res.status(500).json({ message: "Server error during authentication." });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    // Handles both authorize('admin') and authorize(['admin'])
    const allowedRoles = roles.flat();

    if (!allowedRoles.includes(req.role)) {
      return res.status(403).json({
        message: `Access forbidden. Required roles: ${allowedRoles.join(', ')}. Your role: ${req.role}`
      });
    }

    next();
  };
};
