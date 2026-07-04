const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getNotifications, markNotificationRead, markAllNotificationsRead } = require('../controllers/notificationController');

router.get('/', protect, getNotifications);
router.put('/mark-all-read', protect, markAllNotificationsRead);
router.put('/:id/read', protect, markNotificationRead);

module.exports = router;
