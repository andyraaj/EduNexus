process.on('uncaughtException', (err) => {
    console.error('[FATAL] Uncaught Exception:', err);
    try { require('fs').writeFileSync(__dirname + '/fatal.log', String(err.stack || err)); } catch (_) {}
    process.exit(1);
});
process.on('unhandledRejection', (err) => {
    console.error('[FATAL] Unhandled Rejection:', err);
    try { require('fs').writeFileSync(__dirname + '/fatal.log', String(err?.stack || err)); } catch (_) {}
    process.exit(1);
});

const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const path = require('path');
const fs = require('fs');
const { validateEnv } = require('./config/env');
const { initCloudinary } = require('./config/cloudinary');
const {
    requestContext,
    csrfProtection,
    securityHeaders,
    createRateLimiter,
    auditLogger,
    notFound,
    errorHandler,
} = require('./middleware/opsMiddleware');

// Load env vars
dotenv.config({ path: require('path').resolve(__dirname, '../.env') });
validateEnv();

// Connect to Database
connectDB();

// Initialize Cloudinary (validates credentials at startup)
try {
    initCloudinary();
} catch (err) {
    console.error('[Cloudinary] Initialization failed:', err.message);
    if (process.env.NODE_ENV === 'production') process.exit(1);
}

const app = express();
app.set('trust proxy', 1);
const clientDistPath = path.resolve(__dirname, '../client/dist');
const clientIndexPath = path.join(clientDistPath, 'index.html');

const normalizeOrigin = (value) => {
    if (!value) return '';
    return String(value).trim().replace(/\/$/, '');
};

const parseOrigins = (...values) => {
    return values
        .flatMap((value) => String(value || '').split(','))
        .map((value) => normalizeOrigin(value))
        .filter(Boolean);
};

// ── Core Middleware ────────────────────────────────────────────────────────
app.use(requestContext);
app.use(securityHeaders);
app.use('/assets', express.static(path.join(clientDistPath, 'assets'), {
    immutable: true,
    maxAge: '1y',
    fallthrough: true,
}));
app.use(createRateLimiter({ windowMs: 60 * 1000, max: Number(process.env.RATE_LIMIT_PER_MINUTE || 240) }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));

// Cookie parser — required to read the HTTP-Only refresh token cookie
app.use(cookieParser());
app.use(csrfProtection);
app.use(auditLogger);

const { getAllowedOrigins, isAllowedOrigin, getVercelProjectName } = require('./config/env');
const allowedOrigins = getAllowedOrigins();

console.log('[CORS] Allowed origins:', allowedOrigins);
console.log('[CORS] Vercel project name pattern:', getVercelProjectName());

app.use(
    cors({
        origin: function (origin, callback) {
            // Allow requests with no origin (curl, Postman, server-to-server)
            if (!origin) return callback(null, true);

            if (isAllowedOrigin(origin)) {
                return callback(null, true);
            }

            console.error('[CORS] Blocked:', origin);
            return callback(new Error(`Origin not allowed by CORS: ${origin}`));
        },
        credentials: true,
    })
);

app.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        data: {
            status: 'ok',
            service: 'EduNexus-api',
            uptimeSeconds: Math.round(process.uptime()),
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development',
        },
        error: null,
        requestId: req.requestId,
    });
});

// Note: /uploads route removed — all files are served directly from Cloudinary CDN.
// Each route file imports `protect` middleware independently.

// ── API Routes (v1) ────────────────────────────────────────────────────────
app.use('/api/v1/auth', require('./routes/authRoutes'));
app.use('/api/v1/users', require('./routes/userRoutes'));
app.use('/api/v1/profile', require('./routes/profileRoutes'));
app.use('/api/v1/admissions', require('./routes/admissionRoutes'));
app.use('/api/v1/courses', require('./routes/courseRoutes'));
app.use('/api/v1/foundation', require('./routes/foundationRoutes'));
app.use('/api/v1/enrollments', require('./routes/enrollmentRoutes'));
app.use('/api/v1/timetable', require('./routes/timetableRoutes'));
app.use('/api/v1/attendance', require('./routes/attendanceRoutes'));
app.use('/api/v1/qr-attendance', require('./routes/qrAttendanceRoutes'));
app.use('/api/v1/materials', require('./routes/materialRoutes'));
app.use('/api/v1/assignments', require('./routes/assignmentRoutes'));
app.use('/api/v1/submissions', require('./routes/submissionRoutes'));

app.use('/api/v1/billing', require('./routes/billingRoutes'));
app.use('/api/v1/invoices', require('./routes/invoiceRoutes'));
app.use('/api/v1/payments', require('./routes/paymentRoutes'));
app.use('/api/v1/analytics', require('./routes/analyticsRoutes'));
app.use('/api/v1/marks', require('./routes/marksRoutes'));
app.use('/api/v1/quizzes', require('./routes/quizRoutes'));
app.use('/api/v1/attempts', require('./routes/attemptRoutes'));
app.use('/api/v1/results', require('./routes/resultRoutes'));
app.use('/api/v1/messages', require('./routes/messageRoutes'));
app.use('/api/v1/notifications', require('./routes/notificationRoutes'));
app.use('/api/v1/faculty', require('./routes/facultyRoutes'));
app.use('/api/v1/announcements', require('./routes/announcementsRoutes'));
app.use('/api/v1/course-announcements', require('./routes/courseAnnouncementRoutes'));
app.use('/api/v1/admin', require('./routes/adminRoutes'));
app.use('/api/v1/exams', require('./routes/examRoutes'));
app.use('/api/v1/audit-logs', require('./routes/auditRoutes'));
app.use('/api/v1/faculty-addons', require('./routes/facultyAddons'));
app.use('/api/v1/academic-calendars', require('./routes/academicCalendarRoutes'));

// ── Legacy /api/* alias (backward-compatible for old HTML frontend) ─────
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/profile', require('./routes/profileRoutes'));
app.use('/api/admissions', require('./routes/admissionRoutes'));
app.use('/api/foundation', require('./routes/foundationRoutes'));
app.use('/api/timetable', require('./routes/timetableRoutes'));
app.use('/api/attendance', require('./routes/attendanceRoutes'));
app.use('/api/qr-attendance', require('./routes/qrAttendanceRoutes'));
app.use('/api/billing', require('./routes/billingRoutes'));
app.use('/api/marks', require('./routes/marksRoutes'));
app.use('/api/quizzes', require('./routes/quizRoutes'));
app.use('/api/results', require('./routes/resultRoutes'));
app.use('/api/faculty', require('./routes/facultyRoutes'));
app.use('/api/announcements', require('./routes/announcementsRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/exams', require('./routes/examRoutes'));
app.use('/api/audit-logs', require('./routes/auditRoutes'));

// ── API 404 handler ────────────────────────────────────────────────────────
app.use('/api', notFound);

// ── Serve frontend static files (only if client was built here) ──────────
if (fs.existsSync(clientDistPath)) {
    app.use(express.static(clientDistPath));
}

// ── React SPA fallback (must be after static + API routes) ────────────────
app.get('*', (req, res) => {
    if (req.originalUrl.startsWith('/api')) {
        return res.status(404).json({
            success: false,
            message: 'API route not found',
        });
    }
    // If client/dist exists (monorepo deploy), serve the SPA
    if (fs.existsSync(clientIndexPath)) {
        return res.sendFile(clientIndexPath);
    }
    // Frontend is deployed separately (e.g. Vercel) — return API info
    return res.status(200).json({
        success: true,
        data: {
            service: 'EduNexus-api',
            status: 'running',
            note: 'Frontend is hosted separately. Access the API via /api/v1/*',
        },
    });
});

// ── Global Error Handler (must be LAST middleware) ────────────────────────
app.use(errorHandler);

// ── Socket Server ──────────────────────────────────────────────────────────
const http = require('http');
const { initSocket } = require('./socketServer');
const server = http.createServer(app);
initSocket(server);

// ── Start Server ───────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`🚀 EduNexus API & Socket Server running at http://localhost:${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);

    // Start assignment deadline reminder scheduler (checks every 5 minutes)
    setInterval(async () => {
        try {
            const { sendDeadlineReminders } = require('./services/notificationService');
            await sendDeadlineReminders(24);
            await sendDeadlineReminders(1);
        } catch (err) {
            console.error('[DeadlineReminder Scheduler] Error:', err.message);
        }
    }, 5 * 60 * 1000);
});
