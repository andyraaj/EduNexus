const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
    getAllCourses, getMyCourses, getCourseById,
    createCourse, updateCourse, deleteCourse, getCourseRoster, reactivateCourse,
} = require('../controllers/courseController');

// Public-ish listing (any authenticated user can browse courses)
router.route('/')
    .get(protect, getAllCourses)
    .post(protect, authorize('admin'), createCourse);

// Faculty-specific: courses they are assigned to teach
router.get('/my-courses', protect, authorize('faculty'), getMyCourses);

// Course by ID
router.route('/:id')
    .get(protect, getCourseById)
    .put(protect, authorize('admin'), updateCourse)
    .delete(protect, authorize('admin'), deleteCourse);

// Reactivate a deactivated course
router.patch('/:id/reactivate', protect, authorize('admin'), reactivateCourse);

// Roster: Admin and Faculty can view who is enrolled
router.get('/:id/roster', protect, authorize('admin', 'faculty'), getCourseRoster);

module.exports = router;
