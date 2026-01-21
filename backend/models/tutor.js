// models/tutor.js
import mongoose from "mongoose";
import { PREDEFINED_SUBJECTS, PREDEFINED_GRADES } from "../config/academicConfig.js";

const tutorSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    subjects: [{ 
      type: String, 
      required: true,
      enum: PREDEFINED_SUBJECTS
    }],
    grades: [{ 
      type: String, 
      required: true,
      enum: PREDEFINED_GRADES
    }],
  },
  { timestamps: true }
);

const Tutor = mongoose.model("Tutor", tutorSchema);
export default Tutor;
