const express = require('express');
const router = express.Router();
const {
    loginUser,
    registerUser,
    refreshToken,
    logoutUser,
    getMe,
} = require('../controllers/authController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { createRateLimiter } = require('../middleware/opsMiddleware');

const authLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: Number(process.env.AUTH_RATE_LIMIT_PER_15_MINUTES || 30),
});

const requireAdminInProduction = (req, res, next) => {
    if (process.env.NODE_ENV !== 'production') return next();
    return protect(req, res, () => authorize('admin')(req, res, next));
};

// @route  POST /api/v1/auth/register
router.post('/register', requireAdminInProduction, registerUser);

// @route  POST /api/v1/auth/login
router.post('/login', authLimiter, loginUser);

// @route  POST /api/v1/auth/refresh
// Reads the HTTP-Only cookie; no Authorization header needed
router.post('/refresh', authLimiter, refreshToken);

// @route  POST /api/v1/auth/logout
// Requires a valid access token to identify WHO is logging out
router.post('/logout', protect, logoutUser);

// @route  GET /api/v1/auth/me
router.get('/me', protect, getMe);

module.exports = router;
