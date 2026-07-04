const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
    getAssignmentsByCourse,
    createAssignment,
    updateAssignment,
    deleteAssignment,
} = require('../controllers/assignmentController');

// Any authenticated user can view (auth checked in service)
router.get('/course/:courseId', protect, getAssignmentsByCourse);

// Only faculty creates/updates/deletes assignments
router.post('/', protect, authorize('faculty'), createAssignment);
router.put('/:id', protect, authorize('faculty'), updateAssignment);
router.delete('/:id', protect, authorize('faculty'), deleteAssignment);

module.exports = router;
