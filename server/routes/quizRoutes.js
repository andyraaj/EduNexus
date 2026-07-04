const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
    getQuizzesByCourse,
    createQuiz,
    updateQuiz,
    deleteQuiz,
} = require('../controllers/quizController');

// All authenticated roles can access route, filtering logic handled inside service
router.get('/course/:courseId', protect, getQuizzesByCourse);

// Faculty controls
router.post('/', protect, authorize('faculty'), createQuiz);
router.put('/:id', protect, authorize('faculty'), updateQuiz);
router.delete('/:id', protect, authorize('faculty'), deleteQuiz);

module.exports = router;
