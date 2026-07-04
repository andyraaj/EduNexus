const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
    getExamEvents,
    createExamEvent,
    updateExamEvent,
    deleteExamEvent,
} = require('../controllers/examController');

router.get('/', protect, getExamEvents);
router.post('/', protect, authorize('admin'), createExamEvent);
router.put('/:id', protect, authorize('admin'), updateExamEvent);
router.delete('/:id', protect, authorize('admin'), deleteExamEvent);

module.exports = router;
