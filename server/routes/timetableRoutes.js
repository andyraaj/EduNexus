const express = require('express');
const router = express.Router();
const timetableController = require('../controllers/timetableController');
const { protect, authorize } = require('../middleware/authMiddleware');

/**
 * POST /api/v1/timetable
 * Create new timetable entry (Admin only)
 */
router.post('/', protect, authorize('admin'), timetableController.createTimetable);

/**
 * GET /api/v1/timetable/student/:studentId
 * Get timetable for a student
 */
router.get('/student/:studentId', protect, timetableController.getTimetableByStudent);

/**
 * GET /api/v1/timetable/faculty/:facultyId
 * Get timetable for a faculty
 */
router.get('/faculty/:facultyId', protect, timetableController.getTimetableByFaculty);

/**
 * GET /api/v1/timetable
 * Get all timetable entries
 */
router.get('/', protect, timetableController.getAllTimetable);

/**
 * PUT /api/v1/timetable/:id
 * Update timetable entry
 */
router.put('/:id', protect, authorize('admin'), timetableController.updateTimetable);

/**
 * DELETE /api/v1/timetable/:id
 * Delete timetable entry
 */
router.delete('/:id', protect, authorize('admin'), timetableController.deleteTimetable);

module.exports = router;
