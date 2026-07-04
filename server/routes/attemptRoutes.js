const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
    startQuiz,
    submitQuiz,
    getMyAttempts,
    getQuizAttemptsForFaculty,
} = require('../controllers/attemptController');

// Student endpoints
router.post('/:id/start', protect, authorize('student'), startQuiz);
router.post('/:id/submit', protect, authorize('student'), submitQuiz);
router.get('/my-attempts', protect, authorize('student'), getMyAttempts);

// Faculty endpoints
router.get('/quiz/:quizId', protect, authorize('faculty', 'admin'), getQuizAttemptsForFaculty);

module.exports = router;
