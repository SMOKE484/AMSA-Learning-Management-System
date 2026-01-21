import mongoose from "mongoose";
import { PREDEFINED_SUBJECTS, PREDEFINED_GRADES } from "../config/academicConfig.js";

const studentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    grade: { 
      type: String, 
      required: true,
      enum: PREDEFINED_GRADES
    },
    subjects: [{ 
      type: String, 
      required: true,
      enum: PREDEFINED_SUBJECTS
    }],
    parents: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
  },
  { timestamps: true }
);

const Student = mongoose.model("Student", studentSchema);
export default Student;