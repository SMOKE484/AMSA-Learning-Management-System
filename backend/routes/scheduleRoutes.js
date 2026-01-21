import express from "express";
import { createSchedule, getSchedules, updateSchedule, deleteSchedule, getUpcomingClasses } from "../controllers/scheduleController.js";
import { authenticate, authorize } from "../middleware/authMiddleware.js";
import { validateSchedule } from "../middleware/scheduleValidation.js";

const router = express.Router();
router.use(authenticate);

router.get("/", getSchedules);
router.get("/upcoming", getUpcomingClasses);

router.post("/", authorize(["tutor", "admin"]), validateSchedule, createSchedule);
router.put("/:id", authorize(["tutor", "admin"]), validateSchedule, updateSchedule);
router.delete("/:id", authorize(["tutor", "admin"]), deleteSchedule);

export default router;