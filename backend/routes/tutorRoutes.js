import express from "express";
import multer from "multer";
import path from "path";
import {
  getMyProfile,
  addAttendance,
  uploadNote,
  getTutorNotes,
  getAssignedStudents,
  getTutorStudentMarks,
  updateTutorMark,
  uploadMarks
} from "../controllers/tutorController.js";
import { authenticate, authorize } from "../middleware/authMiddleware.js";
import { cache } from "../middleware/cacheMiddleware.js";

const router = express.Router();

// === (File Upload Middleware) ===
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); 
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  // Accept only PDF files
  if (file.mimetype === "application/pdf") {
    cb(null, true);
  } else {
    cb(new Error("Only PDF files are allowed!"), false);
  }
};

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: fileFilter 
});

// ROUTES 
router.use(authenticate);
router.use(authorize("tutor"));
router.get("/me", cache(300), getMyProfile);
router.post("/students/:studentId/attendance", addAttendance); 
router.get("/students/assigned", cache(600), getAssignedStudents); 
router.post("/notes/upload", upload.single("file"), uploadNote); 
router.get("/notes", cache(300), getTutorNotes); 
router.post("/marks/upload", uploadMarks); 
router.get("/marks/view", getTutorStudentMarks);
router.put("/marks/:markId", updateTutorMark);

export default router;