const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
    createSession,
    getSession,
    getMySessions,
    updateStatus,
    regenerateQR,
    manualOverride,
    removeScan,
    scanQR,
    getActiveSessions,
} = require('../controllers/qrAttendanceController');

// ── Faculty Routes ────────────────────────────────────────────────────────────

/** Create a new QR attendance session */
router.post('/sessions', protect, authorize('faculty'), createSession);

/** Get faculty's recent sessions — MUST be before /:id to avoid 'my' matching as an ID */
router.get('/sessions/my', protect, authorize('faculty'), getMySessions);

/** Get a specific session with live scan data */
router.get('/sessions/:id', protect, authorize('faculty', 'admin'), getSession);

/** Pause / resume / end a session */
router.patch('/sessions/:id/status', protect, authorize('faculty'), updateStatus);

/** Regenerate QR token for a session */
router.post('/sessions/:id/regenerate', protect, authorize('faculty'), regenerateQR);

/** Manually mark a student's attendance */
router.patch('/sessions/:id/override', protect, authorize('faculty'), manualOverride);

/** Remove a student's scan */
router.delete('/sessions/:id/scans/:studentId', protect, authorize('faculty'), removeScan);

// ── Student Routes ────────────────────────────────────────────────────────────

/** Submit a scanned QR token */
router.post('/scan', protect, authorize('student'), scanQR);

/** Get active QR sessions for enrolled courses */
router.get('/active', protect, authorize('student'), getActiveSessions);

module.exports = router;
