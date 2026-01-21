import express from "express";
import {
  getMyProfile,
  getAttendance,
  getStudentNotes,
  getMyMarks,
} from "../controllers/studentController.js";
import { authenticate, authorize } from "../middleware/authMiddleware.js";
import { cache } from "../middleware/cacheMiddleware.js";

const router = express.Router();

router.use(authenticate);
router.use(authorize("student"));

// Cache these endpoints for 5 minutes (300 seconds)
router.get("/me", cache(300), getMyProfile);
router.get("/attendance", cache(300), getAttendance);
router.get("/notes", cache(300), getStudentNotes); // Cache notes for 5 minutes
router.get("/marks", cache(300), getMyMarks); // Cache marks for 5 minutes

export default router;