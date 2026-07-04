import mongoose from "mongoose";
import { PREDEFINED_GRADES } from "../config/academicConfig.js";

const studentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    grade: {
      type: String,
      required: true,
      enum: PREDEFINED_GRADES
    },
    subjects: [{ type: String, required: true }],
    parents: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
  },
  { timestamps: true }
);

// Every parent request filters on parents; every student request looks up by user
studentSchema.index({ parents: 1 });
studentSchema.index({ user: 1 }, { unique: true });
studentSchema.index({ grade: 1, subjects: 1 });

const Student = mongoose.model("Student", studentSchema);
export default Student;