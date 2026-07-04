const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
    advanceApplication,
    convertApplicationToStudent,
    createApplication,
    listApplications,
    listPublicPrograms,
    submitPublicApplication,
    updateApplicationDocuments,
    updateApplication,
} = require('../controllers/admissionController');

router.get('/public/programs', listPublicPrograms);
router.post('/public/applications', submitPublicApplication);

router
    .route('/applications')
    .get(protect, authorize('admin'), listApplications)
    .post(protect, authorize('admin'), createApplication);

router
    .route('/applications/:id')
    .put(protect, authorize('admin'), updateApplication);

router.patch('/applications/:id/status', protect, authorize('admin'), advanceApplication);
router.patch('/applications/:id/documents', protect, authorize('admin'), updateApplicationDocuments);
router.post('/applications/:id/convert', protect, authorize('admin'), convertApplicationToStudent);

module.exports = router;
