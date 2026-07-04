const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
    upsertResult,
    approveCourseResults,
    getCourseResults,
    publishCourseResults,
    getMyResults,
    getMyHallTicket,
    downloadMyMarksheet,
    downloadMyTranscript,
} = require('../controllers/resultController');

router.get('/my', protect, authorize('student'), getMyResults);
router.get('/my/hall-ticket', protect, authorize('student'), getMyHallTicket);
router.get('/my/marksheet/:semester', protect, authorize('student'), downloadMyMarksheet);
router.get('/my/transcript', protect, authorize('student'), downloadMyTranscript);

router.post('/', protect, authorize('faculty', 'admin'), upsertResult);
router.get('/course/:courseId', protect, authorize('faculty', 'admin'), getCourseResults);
router.patch('/course/:courseId/approve', protect, authorize('faculty', 'admin'), approveCourseResults);
router.patch('/course/:courseId/publish', protect, authorize('faculty', 'admin'), publishCourseResults);

module.exports = router;
