// models/mark.js
import mongoose from "mongoose";
import { PREDEFINED_GRADES } from "../config/academicConfig.js";

const markSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    tutor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tutor",
      required: true,
    },
    subject: { type: String, required: true },
    grade: {
      type: String,
      required: true,
      enum: PREDEFINED_GRADES
    },
    testName: { type: String, required: true },
    score: { type: Number, required: true },
    total: { type: Number, required: true },
  },
  { timestamps: true }
);

// Marks are always fetched per student, newest first
markSchema.index({ student: 1, createdAt: -1 });
markSchema.index({ tutor: 1 });

export default mongoose.model("Mark", markSchema);
