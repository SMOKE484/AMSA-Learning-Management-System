import express from 'express';
import { checkIn, checkOut, getClassAttendance, getAttendanceHistory, manualOverride, getClassReport, getAllAttendance, markStudentAttendance, markBatchAttendance } from '../controllers/attendanceController.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';
import { validateGeoLocation } from '../middleware/geoValidation.js';

const router = express.Router();

router.post('/classes/:classId/check-in', authenticate, authorize(['student']), validateGeoLocation, checkIn);
router.post('/classes/:classId/check-out', authenticate, authorize(['student']), checkOut);
router.get('/classes/:classId/attendance', authenticate, authorize(['student']), getClassAttendance);
router.get('/classes/:classId/me', authenticate, authorize(['student']), getClassAttendance);
router.get('/my-attendance', authenticate, authorize(['student']), getAttendanceHistory);

router.get('/classes/:classId/report', authenticate, authorize(['tutor']), getClassReport);
router.patch('/attendance/:attendanceId/override', authenticate, authorize(['tutor', 'admin']), manualOverride);
router.get('/admin/all', authenticate, authorize(['admin']), getAllAttendance);
router.post('/classes/:classId/mark-student', authenticate, authorize(['admin', 'tutor']), markStudentAttendance);
router.post('/classes/:classId/mark-batch', authenticate, authorize(['admin', 'tutor']), markBatchAttendance);

export default router;