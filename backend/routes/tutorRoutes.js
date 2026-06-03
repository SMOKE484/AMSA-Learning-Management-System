import express from "express";
import multer from "multer";
import {
  getMyProfile,
  addAttendance,
  getTutorAttendance,
  uploadNote,
  getTutorNotes,
  deleteNote,
  updateNote,
  getAssignedStudents,
  getTutorStudentMarks,
  updateTutorMark,
  uploadMarks
} from "../controllers/tutorController.js";
import { authenticate, authorize } from "../middleware/authMiddleware.js";
import { cache } from "../middleware/cacheMiddleware.js";

const router = express.Router();

// === (File Upload Middleware) ===
const fileFilter = (req, file, cb) => {
  if (file.mimetype === "application/pdf") {
    cb(null, true);
  } else {
    cb(new Error("Only PDF files are allowed!"), false);
  }
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: fileFilter
});

// ROUTES 
router.use(authenticate);
router.use(authorize("tutor"));
router.get("/me", cache(300), getMyProfile);
router.post("/students/:studentId/attendance", addAttendance);
router.get("/attendance", getTutorAttendance);
router.get("/students/assigned", cache(600), getAssignedStudents); 
router.post("/notes/upload", upload.single("file"), uploadNote);
router.get("/notes", cache(300), getTutorNotes);
router.put("/notes/:noteId", updateNote);
router.delete("/notes/:noteId", deleteNote);
router.post("/marks/upload", uploadMarks); 
router.get("/marks/view", getTutorStudentMarks);
router.put("/marks/:markId", updateTutorMark);

export default router;