const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const { handleUploadSingle } = require('../middleware/uploadMiddleware');
const {
    getMaterialsByCourse,
    uploadMaterialFile,
    uploadMaterialLink,
    updateMaterial,
    deleteMaterial,
    trackDownload,
} = require('../controllers/materialController');

// ── Read ─────────────────────────────────────────────────────────────────────
// Any authenticated user can view materials (service enforces enrollment/assignment check)
router.get('/course/:courseId', protect, getMaterialsByCourse);

// ── Faculty: Upload real file (multipart/form-data) ───────────────────────────
router.post('/upload', protect, authorize('faculty', 'admin'), handleUploadSingle, uploadMaterialFile);

// ── Faculty: Add external link (JSON) ─────────────────────────────────────────
router.post('/link', protect, authorize('faculty', 'admin'), uploadMaterialLink);

// ── Faculty: Update metadata ───────────────────────────────────────────────────
router.patch('/:id', protect, authorize('faculty', 'admin'), updateMaterial);

// ── Faculty: Delete ───────────────────────────────────────────────────────────
router.delete('/:id', protect, authorize('faculty', 'admin'), deleteMaterial);

// ── Student: Track download ───────────────────────────────────────────────────
router.post('/:id/download', protect, trackDownload);

module.exports = router;
