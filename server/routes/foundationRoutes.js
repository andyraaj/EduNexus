const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const ctrl = require('../controllers/foundationController');

router.get('/settings', protect, ctrl.getSettings);
router.put('/settings', protect, authorize('admin'), ctrl.updateSettings);

router.get('/departments', protect, ctrl.listDepartments);
router.post('/departments', protect, authorize('admin'), ctrl.createDepartment);
router.put('/departments/:id', protect, authorize('admin'), ctrl.updateDepartment);

router.get('/programs', protect, ctrl.listPrograms);
router.post('/programs', protect, authorize('admin'), ctrl.createProgram);
router.put('/programs/:id', protect, authorize('admin'), ctrl.updateProgram);

router.get('/batches', protect, ctrl.listBatches);
router.post('/batches', protect, authorize('admin'), ctrl.createBatch);
router.put('/batches/:id', protect, authorize('admin'), ctrl.updateBatch);

router.get('/sections', protect, ctrl.listSections);
router.post('/sections', protect, authorize('admin'), ctrl.createSection);
router.put('/sections/:id', protect, authorize('admin'), ctrl.updateSection);

module.exports = router;
