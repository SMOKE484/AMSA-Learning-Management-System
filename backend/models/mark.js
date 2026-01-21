// models/mark.js
import mongoose from "mongoose";
import { PREDEFINED_SUBJECTS, PREDEFINED_GRADES } from "../config/academicConfig.js";

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
    subject: { 
      type: String, 
      required: true,
      enum: PREDEFINED_SUBJECTS
    },
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

export default mongoose.model("Mark", markSchema);
