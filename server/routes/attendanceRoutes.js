const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
    markAttendance,
    getMyRecords,
    getCourseAttendance,
} = require('../controllers/attendanceController');

// Faculty: mark attendance for a course they teach
router.post('/mark', protect, authorize('faculty'), markAttendance);

// Student: get their own attendance history across all enrolled courses
router.get('/my-records', protect, authorize('student'), getMyRecords);

// Faculty & Admin: view all attendance sessions and roster % for a specific course
router.get('/course/:courseId', protect, authorize('faculty', 'admin'), getCourseAttendance);

module.exports = router;
