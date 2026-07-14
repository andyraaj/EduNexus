const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const QRCode = require('qrcode');
const QRSession = require('../models/QRSession');
const AttendanceRecord = require('../models/AttendanceRecord');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const ApiError = require('../utils/ApiError');

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Generate QR code as a data URL (PNG format).
 * This is generated server-side to avoid external API dependencies in production.
 */
const generateQRCodeDataURL = async (token) => {
    try {
        const qrDataURL = await QRCode.toDataURL(token, {
            errorCorrectionLevel: 'M',
            type: 'image/png',
            width: 240,
            margin: 1,
            color: {
                dark: '#000000',
                light: '#FFFFFF',
            },
        });
        return qrDataURL;
    } catch (err) {
        console.error('[QR ATTENDANCE] Failed to generate QR code:', err.message);
        return null;
    }
};

/**
 * Generate a signed, tamper-evident session token.
 * Embeds: sessionId, courseId, facultyId, issuedAt, expiresAt
 */
const generateSessionToken = (sessionId, courseId, facultyId, expiresAt) => {
    const payload = {
        sid: sessionId.toString(),
        cid: courseId.toString(),
        fid: facultyId.toString(),
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(expiresAt.getTime() / 1000),
    };
    // Sign with the app's JWT_SECRET so token is verifiable without a DB hit
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET is not configured. QR attendance tokens cannot be signed.');
    }
    return jwt.sign(payload, secret, { algorithm: 'HS256' });
};

/**
 * Decode + verify a session token (does NOT check DB — fast path).
 */
const verifySessionToken = (token) => {
    try {
        const secret = process.env.JWT_SECRET;
        if (!secret) return null;
        return jwt.verify(token, secret);
    } catch {
        return null;
    }
};

// ── Service Functions ─────────────────────────────────────────────────────────

/**
 * Faculty: Create a new QR attendance session for a course.
 * @param {string} facultyUserId  - User._id of the faculty
 * @param {object} params
 */
const createQRSession = async (facultyUserId, { courseId, durationMinutes = 15, sessionLabel, topic, room, lateAfterMinutes = 10 }) => {
    console.info('[QR ATTENDANCE] createQRSession service', {
        facultyUserId: String(facultyUserId),
        courseId: String(courseId),
        durationMinutes,
        sessionLabel,
        topic,
        room,
        lateAfterMinutes,
    });
    // 1. Verify the faculty teaches this course
    const course = await Course.findById(courseId).select('code title primaryFaculty department');
    if (!course) throw ApiError.notFound('Course not found.');
    if (course.primaryFaculty?.toString() !== facultyUserId.toString()) {
        throw ApiError.forbidden('You are not authorized to manage attendance for this course.');
    }

    // 2. End any existing active sessions for this course (only one at a time)
    await QRSession.updateMany(
        { course: courseId, status: { $in: ['active', 'paused'] } },
        { $set: { status: 'ended' } }
    );

    // 3. Build expiry
    const now = new Date();
    const expiresAt = new Date(now.getTime() + durationMinutes * 60 * 1000);
    const lateAfterMs = lateAfterMinutes * 60 * 1000;

    // 4. Create session doc (we need the _id first for the token)
    const tempId = new (require('mongoose').Types.ObjectId)();
    const token = generateSessionToken(tempId, courseId, facultyUserId, expiresAt);

    // 5. Generate QR code server-side
    const qrCodeDataURL = await generateQRCodeDataURL(token);

    const session = await QRSession.create({
        _id: tempId,
        course: courseId,
        faculty: facultyUserId,
        sessionLabel: sessionLabel || 'Lecture',
        topic: topic || '',
        room: room || '',
        token,
        qrCodeDataURL,
        startedAt: now,
        expiresAt,
        lateAfterMs,
        status: 'active',
        scans: [],
    });

    console.info('[QR ATTENDANCE] session created', {
        sessionId: session._id,
        courseId: session.course,
        facultyUserId: session.faculty,
        expiresAt: session.expiresAt,
    });

    const populated = await session.populate([
        { path: 'course', select: 'code title department' },
        { path: 'faculty', select: 'name email' },
    ]);
    
    return populated;
};

/**
 * Faculty: Get a session by ID (with populated scans for live dashboard).
 */
const getSessionById = async (sessionId, facultyUserId) => {
    const session = await QRSession.findById(sessionId)
        .populate('course', 'code title')
        .populate('faculty', 'name email')
        .populate('scans.student', 'name email rollNumber');

    if (!session) throw ApiError.notFound('Session not found.');
    if (session.faculty._id.toString() !== facultyUserId.toString()) {
        throw ApiError.forbidden('Access denied.');
    }
    return session;
};

/**
 * Faculty: Update session status (pause / end / resume).
 */
const updateSessionStatus = async (sessionId, facultyUserId, status) => {
    const session = await QRSession.findById(sessionId);
    if (!session) throw ApiError.notFound('Session not found.');
    if (session.faculty.toString() !== facultyUserId.toString()) {
        throw ApiError.forbidden('Access denied.');
    }
    session.status = status;

    // When ending, persist scans → AttendanceRecord
    if (status === 'ended') {
        await persistSessionToAttendance(session);
    }

    await session.save();
    return session;
};

/**
 * Faculty: Regenerate the QR token (extends expiry too).
 */
const regenerateQRToken = async (sessionId, facultyUserId, durationMinutes = 15) => {
    const session = await QRSession.findById(sessionId);
    if (!session) throw ApiError.notFound('Session not found.');
    if (session.faculty.toString() !== facultyUserId.toString()) {
        throw ApiError.forbidden('Access denied.');
    }
    if (session.status === 'ended') throw ApiError.badRequest('Cannot regenerate QR for an ended session.');

    const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);
    const newToken = generateSessionToken(session._id, session.course, session.faculty, expiresAt);
    
    // Generate new QR code with the new token
    const qrCodeDataURL = await generateQRCodeDataURL(newToken);
    
    session.token = newToken;
    session.qrCodeDataURL = qrCodeDataURL;
    session.expiresAt = expiresAt;
    session.status = 'active';
    await session.save();

    return session.populate([
        { path: 'course', select: 'code title' },
        { path: 'faculty', select: 'name email' },
    ]);
};

/**
 * Faculty: Manually mark/override a student's attendance status in a session.
 */
const manualOverride = async (sessionId, facultyUserId, studentUserId, attendanceStatus) => {
    const session = await QRSession.findById(sessionId);
    if (!session) throw ApiError.notFound('Session not found.');
    if (session.faculty.toString() !== facultyUserId.toString()) {
        throw ApiError.forbidden('Access denied.');
    }

    const existing = session.scans.find(s => s.student.toString() === studentUserId);
    if (existing) {
        existing.attendanceStatus = attendanceStatus;
    } else {
        session.scans.push({
            student: studentUserId,
            scannedAt: new Date(),
            attendanceStatus,
            deviceInfo: 'Manual Override',
        });
    }
    await session.save();
    return session;
};

/**
 * Faculty: Remove a scan (mark as absent/invalid).
 */
const removeScan = async (sessionId, facultyUserId, studentUserId) => {
    const session = await QRSession.findById(sessionId);
    if (!session) throw ApiError.notFound('Session not found.');
    if (session.faculty.toString() !== facultyUserId.toString()) {
        throw ApiError.forbidden('Access denied.');
    }
    session.scans = session.scans.filter(s => s.student.toString() !== studentUserId);
    await session.save();
    return session;
};

/**
 * Student: Scan a QR code token.
 * Validates everything, records the scan, returns result.
 */
const scanQRCode = async (studentUserId, token, deviceInfo, ipAddress) => {
    console.info('[QR ATTENDANCE] scanQRCode start', {
        studentUserId: String(studentUserId),
        tokenPreview: String(token).slice(0, 16),
        ipAddress,
    });
    // 1. Verify token signature (fast, no DB)
    const decoded = verifySessionToken(token);
    if (!decoded) {
        console.warn('[QR ATTENDANCE] token verification failed', {
            studentUserId: String(studentUserId),
            tokenPreview: String(token).slice(0, 16),
        });
        throw ApiError.badRequest('Invalid or expired QR code.', 'QR_INVALID');
    }

    console.info('[QR ATTENDANCE] token verified', {
        studentUserId: String(studentUserId),
        sessionId: decoded.sid,
        courseId: decoded.cid,
        facultyId: decoded.fid,
    });

    // 2. Load session from DB
    const session = await QRSession.findById(decoded.sid)
        .populate('course', 'code title')
        .populate('faculty', 'name email');

    if (!session) {
        console.warn('[QR ATTENDANCE] session not found', {
            studentUserId: String(studentUserId),
            sessionId: decoded.sid,
        });
        throw ApiError.notFound('Attendance session not found.', 'SESSION_NOT_FOUND');
    }

    console.info('[QR ATTENDANCE] session loaded', {
        sessionId: session._id,
        courseId: session.course?._id || session.course,
        status: session.status,
        expiresAt: session.expiresAt,
    });

    // 3. Status checks
    if (session.status === 'ended') {
        console.warn('[QR ATTENDANCE] session ended', { sessionId: session._id, studentUserId: String(studentUserId) });
        throw ApiError.badRequest('This attendance session has ended.', 'SESSION_ENDED');
    }
    if (session.status === 'paused') {
        console.warn('[QR ATTENDANCE] session paused', { sessionId: session._id, studentUserId: String(studentUserId) });
        throw ApiError.badRequest('Attendance is currently paused. Please wait.', 'SESSION_PAUSED');
    }
    if (new Date() > session.expiresAt) {
        session.status = 'ended';
        await session.save();
        console.warn('[QR ATTENDANCE] qr expired', { sessionId: session._id, studentUserId: String(studentUserId) });
        throw ApiError.badRequest('This QR code has expired.', 'QR_EXPIRED');
    }

    // 4. Duplicate scan check
    const alreadyScanned = session.scans.some(s => s.student.toString() === studentUserId);
    if (alreadyScanned) {
        console.warn('[QR ATTENDANCE] duplicate scan rejected', {
            sessionId: session._id,
            studentUserId: String(studentUserId),
        });
        throw ApiError.conflict('You have already marked attendance for this session.', 'DUPLICATE_SCAN');
    }

    // 5. Enrollment check — student must be enrolled in this course
    const enrollment = await Enrollment.findOne({
        student: studentUserId,
        course: session.course._id,
        status: 'enrolled',
    });
    if (!enrollment) {
        console.warn('[QR ATTENDANCE] enrollment check failed', {
            sessionId: session._id,
            studentUserId: String(studentUserId),
            courseId: String(session.course._id),
        });
        throw ApiError.forbidden('You are not enrolled in this course.', 'NOT_ENROLLED');
    }

    // 6. Determine on-time vs late
    const elapsed = Date.now() - session.startedAt.getTime();
    const attendanceStatus = elapsed > session.lateAfterMs ? 'late' : 'present';

    console.info('[QR ATTENDANCE] attendance status resolved', {
        sessionId: session._id,
        studentUserId: String(studentUserId),
        attendanceStatus,
        elapsedMs: elapsed,
    });

    // 7. Record scan
    session.scans.push({
        student: studentUserId,
        scannedAt: new Date(),
        attendanceStatus,
        deviceInfo: deviceInfo || '',
        ipAddress: ipAddress || '',
    });
    await session.save();

    console.info('[QR ATTENDANCE] scan persisted', {
        sessionId: session._id,
        studentUserId: String(studentUserId),
        attendanceStatus,
        scanCount: session.scans.length,
    });

    return {
        session: {
            _id: session._id,
            course: session.course,
            faculty: session.faculty,
            sessionLabel: session.sessionLabel,
            topic: session.topic,
            room: session.room,
            expiresAt: session.expiresAt,
        },
        attendanceStatus,
        scannedAt: new Date(),
    };
};

/**
 * Get all active sessions a student can see (for their enrolled courses).
 */
const getActiveSessionForStudent = async (studentUserId) => {
    console.info('[QR ATTENDANCE] getActiveSessionForStudent', {
        studentUserId: String(studentUserId),
    });
    // Find enrolled courses
    const enrollments = await Enrollment.find({ student: studentUserId, status: 'enrolled' }).select('course');
    const courseIds = enrollments.map(e => e.course);

    const sessions = await QRSession.find({
        course: { $in: courseIds },
        status: 'active',
        expiresAt: { $gt: new Date() },
    })
        .populate('course', 'code title')
        .populate('faculty', 'name email')
        .sort({ startedAt: -1 });

    console.info('[QR ATTENDANCE] active session query result', {
        studentUserId: String(studentUserId),
        count: sessions.length,
    });

    return sessions;
};

/**
 * Get recent sessions for a faculty member.
 */
const getFacultySessions = async (facultyUserId, limit = 20) => {
    return QRSession.find({ faculty: facultyUserId })
        .populate('course', 'code title')
        .sort({ startedAt: -1 })
        .limit(limit);
};

/**
 * Internal: Persist a completed QR session into the AttendanceRecord collection.
 * This integrates with the existing attendance system.
 */
const persistSessionToAttendance = async (session) => {
    try {
        const date = new Date(session.startedAt);
        date.setUTCHours(0, 0, 0, 0);

        // Get all enrolled students
        const enrollments = await Enrollment.find({ course: session.course, status: 'enrolled' }).select('student');
        const enrolledStudentIds = enrollments.map(e => e.student.toString());

        // Build records array — scanned = present/late, rest = absent
        const scannedIds = new Set(session.scans.map(s => s.student.toString()));
        const records = enrolledStudentIds.map(sid => ({
            student: sid,
            status: scannedIds.has(sid)
                ? (session.scans.find(s => s.student.toString() === sid)?.attendanceStatus || 'present')
                : 'absent',
            remarks: scannedIds.has(sid) ? 'QR Scan' : '',
        }));

        // Upsert
        await AttendanceRecord.findOneAndUpdate(
            { course: session.course, date },
            { $set: { faculty: session.faculty, records } },
            { upsert: true, new: true }
        );
    } catch (err) {
        console.error('[QR Attendance] Failed to persist session:', err.message);
    }
};

module.exports = {
    createQRSession,
    getSessionById,
    updateSessionStatus,
    regenerateQRToken,
    manualOverride,
    removeScan,
    scanQRCode,
    getActiveSessionForStudent,
    getFacultySessions,
};
