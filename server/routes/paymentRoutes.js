const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
    processPayment,
    getHistory,
} = require('../controllers/paymentController');

// Student & Admin can process
router.post('/', protect, authorize('student', 'admin'), processPayment);

// Polymorphic function (fetches 'my' history if student, 'all' if admin)
router.get('/history', protect, authorize('student', 'admin'), getHistory);

module.exports = router;
