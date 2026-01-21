import express from "express";
import { 
  getAcademicConfig, 
  getSubjects, 
  getGrades 
} from "../controllers/academicController.js";
import { cache } from "../middleware/cacheMiddleware.js";

const router = express.Router();

// Public routes - no authentication required
router.get("/config", cache(86400), getAcademicConfig); // Cache for 24 hours
router.get("/subjects", cache(86400), getSubjects);
router.get("/grades", cache(86400), getGrades);

export default router;