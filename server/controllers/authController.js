const User = require('../models/User');
const Student = require('../models/Student');
const Faculty = require('../models/Faculty');
const {
    generateAccessToken,
    generateRefreshToken,
    verifyUserCredentials,
    saveRefreshToken,
    validateRefreshToken,
    revokeRefreshToken,
} = require('../services/authService');
const jwt = require('jsonwebtoken');

const isProduction = process.env.NODE_ENV === 'production';
const getAuthCookieOptions = () => ({
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
});

const getCsrfCookieOptions = () => ({
    httpOnly: false,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
});

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Set the refresh token as an HTTP-only Secure cookie.
 * This prevents JavaScript (XSS) from reading it.
 */
const setRefreshTokenCookie = (res, token) => {
    res.cookie('EduNexus_refresh', token, getAuthCookieOptions());
};

const setCsrfCookie = (res) => {
    const token = require('crypto').randomBytes(32).toString('hex');
    res.cookie('EduNexus_csrf', token, getCsrfCookieOptions());
    return token;
};

// ── Standardized Response Helpers ────────────────────────────────────────────
const sendSuccess = (res, statusCode, data, message = 'Success') => {
    return res.status(statusCode).json({ success: true, message, data, error: null });
};

const sendError = (res, statusCode, message, code = 'ERROR') => {
    return res.status(statusCode).json({ success: false, data: null, error: { code, message } });
};

// ── Controllers ──────────────────────────────────────────────────────────────

/**
 * @desc    Authenticate user & return access token + set refresh cookie
 * @route   POST /api/v1/auth/login
 * @access  Public
 */
const loginUser = async (req, res) => {
    try {
        const { email, password, role } = req.body;
        const normalizedEmail = String(email || '').trim().toLowerCase();

        if (!email || !password || !role) {
            return sendError(res, 400, 'Email, password, and role are required.', 'MISSING_FIELDS');
        }

        const user = await verifyUserCredentials(normalizedEmail, password, role);

        if (!user) {
            console.warn('[AUTH] login failed: invalid credentials or role', {
                email: normalizedEmail,
                role,
                requestId: req.requestId,
            });
            return sendError(res, 401, 'Invalid credentials or role.', 'AUTH_FAILED');
        }

        if (!user.isActive) {
            return sendError(res, 403, 'Your account has been deactivated.', 'ACCOUNT_INACTIVE');
        }

        let accessToken;
        let refreshToken;

        try {
            accessToken = generateAccessToken(user._id, user.role);
            refreshToken = generateRefreshToken();
        } catch (tokenErr) {
            console.error('[AUTH] token generation failed', {
                requestId: req.requestId,
                userId: user._id?.toString?.() || String(user._id),
                role: user.role,
                code: tokenErr.code || tokenErr.name,
                message: tokenErr.message,
            });

            if (tokenErr.code === 'JWT_SECRET_MISSING') {
                return sendError(res, 503, 'Authentication is temporarily unavailable.', 'JWT_SECRET_MISSING');
            }

            return sendError(res, 500, 'An internal server error occurred.', 'JWT_SIGNING_FAILED');
        }

        try {
            // Persist hashed refresh token + update lastLogin in DB
            await saveRefreshToken(user._id, refreshToken);
        } catch (dbErr) {
            console.error('[AUTH] login persistence failed', {
                requestId: req.requestId,
                userId: user._id?.toString?.() || String(user._id),
                role: user.role,
                code: dbErr.code || dbErr.name,
                message: dbErr.message,
            });
            return sendError(res, 503, 'Authentication storage failed.', 'AUTH_PERSIST_FAILED');
        }

        // Set the refresh token as a secure cookie on the response
        // Cookie format must match refreshToken() expectations: "<userId>:<token>"
        setRefreshTokenCookie(res, `${user._id}:${refreshToken}`);
        setCsrfCookie(res);

        return sendSuccess(res, 200, {
            accessToken,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        }, 'Login successful.');
    } catch (err) {
        console.error('[AUTH] loginUser error:', {
            requestId: req.requestId,
            code: err?.code || err?.name || 'UNKNOWN',
            message: err?.message || String(err),
            stack: err?.stack,
        });
        return sendError(res, 500, err?.message || 'An internal server error occurred.', err?.code || 'SERVER_ERROR');
    }
};

/**
 * @desc    Register a new user (Admin action only in production)
 * @route   POST /api/v1/auth/register
 * @access  Public (demo) / Admin
 */
const registerUser = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        const normalizedEmail = String(email || '').trim().toLowerCase();

        if (!name || !email || !password || !role) {
            return sendError(res, 400, 'All fields are required.', 'MISSING_FIELDS');
        }

        const userExists = await User.findOne({ email: normalizedEmail });
        if (userExists) {
            return sendError(res, 409, 'A user with this email already exists.', 'USER_EXISTS');
        }

        const user = await User.create({ name, email: normalizedEmail, password, role });

        // Create a role-specific profile placeholder
        if (role === 'student') {
            await Student.create({
                user: user._id,
                rollNumber: 'TEMP' + Date.now(),
                department: 'General',
                semester: 1,
                batchYear: new Date().getFullYear(),
            });
        } else if (role === 'faculty') {
            await Faculty.create({
                user: user._id,
                employeeId: 'EMP' + Date.now(),
                department: 'General',
                designation: 'Lecturer',
            });
        }

        return sendSuccess(res, 201, {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
        }, 'User registered successfully.');
    } catch (err) {
        console.error('[AUTH] registerUser error:', {
            requestId: req.requestId,
            code: err?.code || err?.name || 'UNKNOWN',
            message: err?.message || String(err),
            stack: err?.stack,
        });
        return sendError(res, 500, err?.message || 'An internal server error occurred.', err?.code || 'SERVER_ERROR');
    }
};

/**
 * @desc    Refresh the access token using the HTTP-only refresh cookie
 * @route   POST /api/v1/auth/refresh
 * @access  Public (requires valid refresh cookie)
 */
const refreshToken = async (req, res) => {
    try {
        const incomingRefreshToken = req.cookies?.EduNexus_refresh;

        if (!incomingRefreshToken) {
            return sendError(res, 401, 'No refresh token provided.', 'NO_REFRESH_TOKEN');
        }

        // Decode the token to get the userId (we don't verify signature here, this is a DB-hash check)
        // The refresh token is opaque — we must find the user by checking all hashed tokens.
        // A more scalable approach uses a userId embedded in the cookie alongside the token.
        // For now, we embed the userId in the cookie value as: "<userId>:<token>"
        const [userId, plainToken] = incomingRefreshToken.split(':');

        if (!userId || !plainToken) {
            return sendError(res, 401, 'Malformed refresh token.', 'INVALID_TOKEN');
        }

        const user = await validateRefreshToken(userId, plainToken);
        if (!user) {
            console.warn('[AUTH] refresh failed: invalid token', {
                requestId: req.requestId,
                userId,
            });
            return sendError(res, 401, 'Refresh token is invalid or has expired.', 'REFRESH_FAILED');
        }

        // Rotate: generate new tokens
        const newAccessToken = generateAccessToken(user._id, user.role);
        const newRefreshToken = generateRefreshToken();
        await saveRefreshToken(user._id, newRefreshToken);

        setRefreshTokenCookie(res, `${user._id}:${newRefreshToken}`);
        setCsrfCookie(res);

        return sendSuccess(res, 200, { accessToken: newAccessToken }, 'Token refreshed.');
    } catch (err) {
        console.error('[AUTH] refreshToken error:', {
            requestId: req.requestId,
            code: err?.code || err?.name || 'UNKNOWN',
            message: err?.message || String(err),
            stack: err?.stack,
        });
        return sendError(res, 500, err?.message || 'An internal server error occurred.', err?.code || 'SERVER_ERROR');
    }
};

/**
 * @desc    Logout user — clear refresh cookie and revoke DB token
 * @route   POST /api/v1/auth/logout
 * @access  Private
 */
const logoutUser = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (userId) {
            await revokeRefreshToken(userId);
        }

        res.clearCookie('EduNexus_refresh', {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'none' : 'lax',
        });
        res.clearCookie('EduNexus_csrf', {
            secure: isProduction,
            sameSite: isProduction ? 'none' : 'lax',
        });

        return sendSuccess(res, 200, null, 'Logged out successfully.');
    } catch (err) {
        console.error('[AUTH] logoutUser error:', {
            requestId: req.requestId,
            code: err?.code || err?.name || 'UNKNOWN',
            message: err?.message || String(err),
            stack: err?.stack,
        });
        return sendError(res, 500, err?.message || 'An internal server error occurred.', err?.code || 'SERVER_ERROR');
    }
};

/**
 * @desc    Get current logged-in user info
 * @route   GET /api/v1/auth/me
 * @access  Private
 */
const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return sendError(res, 404, 'User not found.', 'USER_NOT_FOUND');
        }
        return sendSuccess(res, 200, {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            lastLogin: user.lastLogin,
        });
    } catch (err) {
        console.error('[AUTH] getMe error:', {
            requestId: req.requestId,
            userId: req.user?.id,
            code: err?.code || err?.name || 'UNKNOWN',
            message: err?.message || String(err),
            stack: err?.stack,
        });
        return sendError(res, 500, err?.message || 'An internal server error occurred.', err?.code || 'SERVER_ERROR');
    }
};

module.exports = { loginUser, registerUser, refreshToken, logoutUser, getMe };
