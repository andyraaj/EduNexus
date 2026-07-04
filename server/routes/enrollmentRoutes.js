const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
    getMyCourses, getTeachingCourses,
} = require('../controllers/enrollmentController');

// ─────────────────────────────────────────────────────────────────────────────
// NOTE: Student self-enrollment has been REMOVED.
// Enrollment is now managed exclusively by the admin (via Admin Courses page).
// The backend auto-enrollment logic in getMyCourses() automatically assigns
// students to courses matching their department + semester from their profile.
// ─────────────────────────────────────────────────────────────────────────────

// Student: view all automatically assigned courses
router.get('/my-courses', protect, authorize('student'), getMyCourses);

// Faculty: view all courses they teach (with enrollment counts)
router.get('/teaching', protect, authorize('faculty'), getTeachingCourses);

module.exports = router;
