const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const qrService = require('../services/qrAttendanceService');
const { getIO } = require('../socketServer');

// ── Faculty Controllers ───────────────────────────────────────────────────────

/**
 * POST /api/v1/qr-attendance/sessions
 * Faculty creates a new QR attendance session.
 */
const createSession = asyncHandler(async (req, res) => {
    const { courseId, durationMinutes, sessionLabel, topic, room, lateAfterMinutes } = req.body;
    if (!courseId) throw ApiError.badRequest('courseId is required.', 'MISSING_FIELDS');

    console.info('[QR ATTENDANCE] createSession request', {
        requestId: req.requestId,
        userId: req.user?.id,
        courseId,
        durationMinutes,
        sessionLabel,
        topic,
        room,
        lateAfterMinutes,
    });

    const session = await qrService.createQRSession(req.user.id, {
        courseId,
        durationMinutes: Number(durationMinutes) || 15,
        sessionLabel,
        topic,
        room,
        lateAfterMinutes: Number(lateAfterMinutes) || 10,
    });

    // Notify all students in the course's socket room
    try {
        const io = getIO();
        io.to(`course_${courseId}`).emit('qr_session_started', {
            sessionId: session._id,
            courseCode: session.course?.code,
            courseTitle: session.course?.title,
            facultyName: session.faculty?.name,
            expiresAt: session.expiresAt,
            sessionLabel: session.sessionLabel,
        });
    } catch { /* socket not critical */ }

    console.info('[QR ATTENDANCE] createSession success', {
        requestId: req.requestId,
        sessionId: session._id,
        courseId: session.course?._id || session.course,
        expiresAt: session.expiresAt,
    });

    return ApiResponse.success(res, 201, { session }, 'QR attendance session created.');
});

/**
 * GET /api/v1/qr-attendance/sessions/:id
 * Faculty fetches a session with live scan list.
 */
const getSession = asyncHandler(async (req, res) => {
    const session = await qrService.getSessionById(req.params.id, req.user.id);
    return ApiResponse.success(res, 200, { session }, 'Session fetched.');
});

/**
 * GET /api/v1/qr-attendance/sessions/my
 * Faculty fetches their recent sessions.
 */
const getMySessions = asyncHandler(async (req, res) => {
    const sessions = await qrService.getFacultySessions(req.user.id, 30);
    return ApiResponse.success(res, 200, { sessions }, 'Sessions fetched.');
});

/**
 * PATCH /api/v1/qr-attendance/sessions/:id/status
 * Faculty updates session status (pause / end / resume).
 */
const updateStatus = asyncHandler(async (req, res) => {
    const { status } = req.body;
    if (!['active', 'paused', 'ended'].includes(status)) {
        throw ApiError.badRequest('Invalid status. Must be active, paused, or ended.', 'INVALID_STATUS');
    }

    const session = await qrService.updateSessionStatus(req.params.id, req.user.id, status);

    try {
        const io = getIO();
        io.to(`course_${session.course}`).emit('qr_session_status', {
            sessionId: session._id,
            status,
        });
        if (status === 'ended') {
            io.to(`course_${session.course}`).emit('qr_session_ended', { sessionId: session._id });
        }
    } catch { /* socket not critical */ }

    return ApiResponse.success(res, 200, { session }, 'Session status updated.');
});

/**
 * POST /api/v1/qr-attendance/sessions/:id/regenerate
 * Faculty regenerates the QR token (extends window).
 */
const regenerateQR = asyncHandler(async (req, res) => {
    const { durationMinutes } = req.body;
    const session = await qrService.regenerateQRToken(
        req.params.id,
        req.user.id,
        Number(durationMinutes) || 15
    );

    try {
        const io = getIO();
        io.to(`course_${session.course._id}`).emit('qr_session_regenerated', {
            sessionId: session._id,
            token: session.token,
            expiresAt: session.expiresAt,
        });
    } catch { /* socket not critical */ }

    return ApiResponse.success(res, 200, { session }, 'QR regenerated.');
});

/**
 * PATCH /api/v1/qr-attendance/sessions/:id/override
 * Faculty manually marks a student's attendance.
 */
const manualOverride = asyncHandler(async (req, res) => {
    const { studentId, attendanceStatus } = req.body;
    if (!studentId || !attendanceStatus) {
        throw ApiError.badRequest('studentId and attendanceStatus are required.', 'MISSING_FIELDS');
    }
    const session = await qrService.manualOverride(req.params.id, req.user.id, studentId, attendanceStatus);
    return ApiResponse.success(res, 200, { session }, 'Manual override applied.');
});

/**
 * DELETE /api/v1/qr-attendance/sessions/:id/scans/:studentId
 * Faculty removes a student's scan.
 */
const removeScan = asyncHandler(async (req, res) => {
    const session = await qrService.removeScan(req.params.id, req.user.id, req.params.studentId);
    return ApiResponse.success(res, 200, { session }, 'Scan removed.');
});

// ── Student Controllers ───────────────────────────────────────────────────────

/**
 * POST /api/v1/qr-attendance/scan
 * Student scans a QR code token.
 */
const scanQR = asyncHandler(async (req, res) => {
    const { token } = req.body;
    if (!token) throw ApiError.badRequest('QR token is required.', 'MISSING_TOKEN');

    const deviceInfo = req.headers['user-agent'] || '';
    const ipAddress = req.ip || req.connection?.remoteAddress || '';

    console.info('[QR ATTENDANCE] scan request', {
        requestId: req.requestId,
        studentId: req.user?.id,
        tokenPreview: String(token).slice(0, 16),
        ipAddress,
        deviceInfo,
    });

    const result = await qrService.scanQRCode(req.user.id, token, deviceInfo, ipAddress);

    // Real-time: notify faculty's session room
    try {
        const io = getIO();
        io.to(`qr_session_${result.session._id}`).emit('qr_new_scan', {
            sessionId: result.session._id,
            studentId: req.user.id,
            attendanceStatus: result.attendanceStatus,
            scannedAt: result.scannedAt,
        });
    } catch { /* socket not critical */ }

    console.info('[QR ATTENDANCE] scan success', {
        requestId: req.requestId,
        studentId: req.user?.id,
        sessionId: result.session._id,
        attendanceStatus: result.attendanceStatus,
        scannedAt: result.scannedAt,
    });

    return ApiResponse.success(res, 200, { result }, 'Attendance marked successfully via QR.');
});

/**
 * GET /api/v1/qr-attendance/active
 * Student fetches active sessions for their enrolled courses.
 */
const getActiveSessions = asyncHandler(async (req, res) => {
    console.info('[QR ATTENDANCE] active sessions request', {
        requestId: req.requestId,
        studentId: req.user?.id,
    });
    const sessions = await qrService.getActiveSessionForStudent(req.user.id);
    console.info('[QR ATTENDANCE] active sessions response', {
        requestId: req.requestId,
        studentId: req.user?.id,
        count: sessions.length,
    });
    return ApiResponse.success(res, 200, { sessions }, 'Active sessions fetched.');
});

module.exports = {
    createSession,
    getSession,
    getMySessions,
    updateStatus,
    regenerateQR,
    manualOverride,
    removeScan,
    scanQR,
    getActiveSessions,
};
