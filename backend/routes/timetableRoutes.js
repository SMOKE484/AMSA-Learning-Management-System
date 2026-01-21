import express from "express";
import { authenticate, authorize } from "../middleware/authMiddleware.js";
import { 
  getStudentTimetable,
  getTutorTimetable,
  getTodaysSchedule,
  getWeeklySummary
} from "../controllers/timetableController.js";
import { cache } from "../middleware/cacheMiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Student timetable routes
router.get("/student", 
  authorize(["student"]),
  cache(300), // Cache for 5 minutes
  getStudentTimetable
);

// Tutor timetable routes
router.get("/tutor", 
  authorize(["tutor"]),
  cache(300), // Cache for 5 minutes
  getTutorTimetable
);

// Today's schedule for current user
router.get("/today", 
  authorize(["student", "tutor"]),
  cache(180), // Cache for 3 minutes (shorter cache for today's schedule)
  getTodaysSchedule
);

// Weekly summary
router.get("/weekly-summary", 
  authorize(["student", "tutor"]),
  cache(600), // Cache for 10 minutes
  getWeeklySummary
);

export default router;