const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const { handleUploadSingle } = require('../middleware/uploadMiddleware');
const {
    getCalendars,
    uploadCalendar,
    proxyCalendarFile,
    downloadCalendarFile,
    deleteCalendar,
} = require('../controllers/academicCalendarController');

router.get('/', protect, getCalendars);
router.get('/:id/file', protect, proxyCalendarFile);
router.get('/:id/download', protect, downloadCalendarFile);
router.post('/', protect, authorize('admin'), handleUploadSingle, uploadCalendar);
router.delete('/:id', protect, authorize('admin'), deleteCalendar);

module.exports = router;
