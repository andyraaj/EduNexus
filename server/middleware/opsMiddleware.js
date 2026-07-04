const crypto = require('crypto');
const AuditLog = require('../models/AuditLog');

const sendError = (res, status, code, message, requestId) => {
    res.status(status).json({
        success: false,
        data: null,
        error: { code, message },
        requestId,
    });
};

const requestContext = (req, res, next) => {
    const requestId = req.headers['x-request-id'] || crypto.randomUUID();
    req.requestId = requestId;
    res.setHeader('X-Request-Id', requestId);
    next();
};

const csrfProtection = (req, res, next) => {
    const cookieName = 'EduNexus_csrf';
    const existingToken = req.cookies?.[cookieName];
    const token = existingToken || crypto.randomBytes(32).toString('hex');

    if (!existingToken) {
        const isProduction = process.env.NODE_ENV === 'production';
        res.cookie(cookieName, token, {
            httpOnly: false,
            secure: isProduction,
            sameSite: isProduction ? 'none' : 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });
    }

    const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
    const exempt = req.path === '/health'
        || req.originalUrl.includes('/auth/login')
        || req.originalUrl.includes('/auth/refresh');

    if (!isMutation || exempt) return next();

    const submitted = req.headers['x-csrf-token'];
    if (!submitted || submitted !== token) {
        return sendError(res, 403, 'CSRF_FAILED', 'Invalid or missing CSRF token.', req.requestId);
    }

    next();
};

const securityHeaders = (req, res, next) => {
    const clientOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);

    // Build connect-src dynamically: always allow 'self', plus derive ws/wss from client origins
    const connectSources = ["'self'"];
    clientOrigins.forEach((origin) => {
        connectSources.push(origin);
        // Derive WebSocket URL from each origin
        connectSources.push(origin.replace(/^http/, 'ws'));
    });
    // In development, also allow localhost backend
    if (process.env.NODE_ENV !== 'production') {
        connectSources.push('http://localhost:5000', 'ws://localhost:5000', 'wss://localhost:5000');
    }

    res.setHeader('X-Content-Type-Options', 'nosniff');
    // Allow embedding from same origin or allowed client origins for PDF previews
    res.setHeader('X-Frame-Options', 'SAMEORIGIN'); 
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    // Allow camera for QR scanning in student portal
    res.setHeader('Permissions-Policy', 'camera=*, microphone=(), geolocation=()');
    
    const frameAncestors = ["'self'", ...clientOrigins].join(' ');

    res.setHeader('Content-Security-Policy', [
        "default-src 'self'",
        "base-uri 'self'",
        "object-src 'self'", // Allow PDFs to be loaded in <object> or <embed> if needed
        `frame-ancestors ${frameAncestors}`, // Allow embedding in our own frontend iframes
        "script-src 'self' 'unsafe-inline'",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        // Allow QR code image from external service + data URIs + Google Fonts
        "img-src 'self' data: blob: https://api.qrserver.com https:",
        "font-src 'self' https://fonts.gstatic.com data:",
        `connect-src ${connectSources.join(' ')}`,
        // Allow media (camera stream)
        "media-src 'self' blob:",
    ].join('; '));
    next();

};

const createRateLimiter = ({ windowMs = 60000, max = 120 } = {}) => {
    const hits = new Map();
    let redisClient = null;
    let redisReady = false;

    if (process.env.REDIS_URL) {
        try {
            const { createClient } = require('redis');
            redisClient = createClient({ url: process.env.REDIS_URL });
            redisClient.on('error', (err) => {
                redisReady = false;
                if (process.env.NODE_ENV !== 'test') console.error('[RATE_LIMIT] Redis error:', err.message);
            });
            redisClient.connect()
                .then(() => { redisReady = true; })
                .catch((err) => {
                    redisReady = false;
                    if (process.env.NODE_ENV !== 'test') console.error('[RATE_LIMIT] Redis unavailable, using memory:', err.message);
                });
        } catch (err) {
            if (process.env.NODE_ENV !== 'test') console.error('[RATE_LIMIT] Redis package unavailable, using memory:', err.message);
        }
    }

    return async (req, res, next) => {
        if (
            process.env.DISABLE_RATE_LIMIT === 'true' ||
            process.env.NODE_ENV === 'development' ||
            process.env.NODE_ENV === 'test'
        ) {
            return next();
        }

        const now = Date.now();
        const key = req.ip || req.socket?.remoteAddress || 'unknown';

        if (redisClient && redisReady) {
            try {
                const redisKey = `rate:${key}:${Math.floor(now / windowMs)}`;
                const count = await redisClient.incr(redisKey);
                if (count === 1) await redisClient.pExpire(redisKey, windowMs);
                res.setHeader('RateLimit-Limit', String(max));
                res.setHeader('RateLimit-Remaining', String(Math.max(0, max - count)));
                res.setHeader('RateLimit-Reset', String(Math.ceil((now + windowMs) / 1000)));
                if (count > max) {
                    return sendError(res, 429, 'RATE_LIMITED', 'Too many requests. Please try again shortly.', req.requestId);
                }
                return next();
            } catch (err) {
                redisReady = false;
                if (process.env.NODE_ENV !== 'test') console.error('[RATE_LIMIT] Redis failed during request, using memory:', err.message);
            }
        }

        const record = hits.get(key) || { count: 0, resetAt: now + windowMs };

        if (record.resetAt <= now) {
            record.count = 0;
            record.resetAt = now + windowMs;
        }

        record.count += 1;
        hits.set(key, record);

        res.setHeader('RateLimit-Limit', String(max));
        res.setHeader('RateLimit-Remaining', String(Math.max(0, max - record.count)));
        res.setHeader('RateLimit-Reset', String(Math.ceil(record.resetAt / 1000)));

        if (record.count > max) {
            return sendError(res, 429, 'RATE_LIMITED', 'Too many requests. Please try again shortly.', req.requestId);
        }

        next();
    };
};

const auditLogger = (req, res, next) => {
    const shouldAudit = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)
        && !req.originalUrl.includes('/auth/refresh')
        && !req.originalUrl.includes('/health');

    if (!shouldAudit) return next();

    const summarizeBody = (body = {}) => {
        const blocked = new Set(['password', 'refreshToken', 'refreshTokenHash', 'token', 'accessToken']);
        const summary = {};
        Object.entries(body || {}).slice(0, 12).forEach(([key, value]) => {
            if (blocked.has(key)) summary[key] = '[redacted]';
            else if (Array.isArray(value)) summary[key] = `array(${value.length})`;
            else if (value && typeof value === 'object') summary[key] = 'object';
            else summary[key] = value;
        });
        return summary;
    };

    res.on('finish', () => {
        const actorRole = req.user?.role || 'anonymous';
        const shouldPersist = actorRole !== 'anonymous' || req.originalUrl.includes('/auth/login');
        if (!shouldPersist) return;
        const category = req.originalUrl.includes('/auth/')
            ? 'auth'
            : actorRole === 'admin'
                ? 'admin_write'
                : actorRole === 'faculty'
                    ? 'faculty_write'
                    : actorRole === 'student'
                        ? 'student_write'
                        : 'public_write';

        AuditLog.create({
            actor: req.user?.id || null,
            actorRole,
            action: `${req.method} ${req.originalUrl}`,
            category,
            method: req.method,
            path: req.originalUrl,
            statusCode: res.statusCode,
            ip: req.ip || req.socket?.remoteAddress || '',
            userAgent: req.headers['user-agent'] || '',
            requestId: req.requestId || '',
            requestSummary: ['admin', 'faculty'].includes(actorRole) ? summarizeBody(req.body) : null,
        }).catch((err) => {
            if (process.env.NODE_ENV !== 'test') {
                console.error('[AUDIT] Failed to persist audit log:', err.message);
            }
        });
    });

    next();
};

const notFound = (req, res) => {
    sendError(res, 404, 'NOT_FOUND', `Route not found: ${req.method} ${req.originalUrl}`, req.requestId);
};

const errorHandler = (err, req, res, next) => {
    if (res.headersSent) return next(err);

    let status = err.statusCode || err.status || 500;
    let code = err.code || 'SERVER_ERROR';
    let message = err.message || 'An internal server error occurred.';

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        status = 400;
        code = 'VALIDATION_ERROR';
        const messages = Object.values(err.errors).map(e => e.message);
        message = messages.join('; ');
    }

    // Mongoose duplicate key error
    if (err.code === 11000) {
        status = 409;
        code = 'DUPLICATE_KEY';
        const field = Object.keys(err.keyValue || {}).join(', ');
        message = `Duplicate value for field: ${field}`;
    }

    // Mongoose cast error (invalid ObjectId)
    if (err.name === 'CastError') {
        status = 400;
        code = 'INVALID_ID';
        message = `Invalid ${err.path}: ${err.value}`;
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        status = 401;
        code = 'INVALID_TOKEN';
        message = 'Invalid token.';
    }
    if (err.name === 'TokenExpiredError') {
        status = 401;
        code = 'TOKEN_EXPIRED';
        message = 'Token has expired.';
    }

    // Only log server errors, not expected operational errors
    if (status >= 500) {
        console.error(`[${req.requestId || 'no-request-id'}]`, err);
    }

    // Suppress internal details in production for 5xx
    if (status >= 500 && process.env.NODE_ENV === 'production') {
        message = 'An internal server error occurred.';
    }

    sendError(res, status, code, message, req.requestId);
};

module.exports = {
    requestContext,
    csrfProtection,
    securityHeaders,
    createRateLimiter,
    auditLogger,
    notFound,
    errorHandler,
};
