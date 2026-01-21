// models/notes.js
import mongoose from "mongoose";
import { PREDEFINED_SUBJECTS, PREDEFINED_GRADES } from "../config/academicConfig.js";

const Schema = mongoose.Schema;

const noteSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
    },
    description: {
      type: String,
      default: "",
    },
    fileUrl: {
      type: String,
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
  },
  { timestamps: true }
);

const Note = mongoose.model("Note", noteSchema);
export default Note;