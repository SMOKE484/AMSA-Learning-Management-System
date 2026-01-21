// routes/notesRoutes.js
import express from "express";
import {
  uploadNote,
  getMyNotes,
  getTutorNotes,
} from "../controllers/notesController.js";
import { authenticate, authorize } from "../middleware/authMiddleware.js";
import { cache } from "../middleware/cacheMiddleware.js";

const router = express.Router();

// Apply authentication to all routes in this file
router.use(authenticate);

// Tutor uploads a note
router.post("/upload", authorize("tutor"), uploadNote);

// Student views assigned notes (Cached)
router.get("/myNotes", authorize("student"), cache(300), getMyNotes);

// Tutor views their notes (Cached)
router.get("/tutorNotes", authorize("tutor"), cache(300), getTutorNotes);

export default router;