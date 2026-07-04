const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
    getStudentAnalytics,
    getFacultyAnalytics,
    getAdminAnalytics
} = require('../controllers/analyticsController');

router.get('/student', protect, authorize('student'), getStudentAnalytics);
router.get('/faculty/:courseId', protect, authorize('faculty', 'admin'), getFacultyAnalytics);
router.get('/admin', protect, authorize('admin'), getAdminAnalytics);

module.exports = router;
