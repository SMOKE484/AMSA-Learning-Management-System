import express from 'express';
import { checkIn, checkOut, getClassAttendance, getAttendanceHistory, manualOverride, getClassReport,getAllAttendance } from '../controllers/attendanceController.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/classes/:classId/check-in', authenticate, authorize(['student']), checkIn);
router.post('/classes/:classId/check-out', authenticate, authorize(['student']), checkOut);
router.get('/classes/:classId/attendance', authenticate, authorize(['student']), getClassAttendance);
router.get('/my-attendance', authenticate, authorize(['student']), getAttendanceHistory);

router.get('/classes/:classId/report', authenticate, authorize(['tutor']), getClassReport);
router.patch('/attendance/:attendanceId/override', authenticate, authorize(['tutor', 'admin']), manualOverride);
router.get('/admin/all', authenticate, authorize(['admin']), getAllAttendance);

export default router;