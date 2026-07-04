const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
    submitAssignment,
    getSubmissionsForAssignment,
    getMySubmission,
    getAllMySubmissions,
    gradeSubmission,
} = require('../controllers/submissionController');

// Students submit and fetch their own submissions
router.post('/', protect, authorize('student'), submitAssignment);
router.get('/my', protect, authorize('student'), getAllMySubmissions);
router.get('/my/:assignmentId', protect, authorize('student'), getMySubmission);

// Faculty view all submissions and grade them
router.get('/assignment/:assignmentId', protect, authorize('faculty'), getSubmissionsForAssignment);
router.put('/:id/grade', protect, authorize('faculty'), gradeSubmission);

module.exports = router;
