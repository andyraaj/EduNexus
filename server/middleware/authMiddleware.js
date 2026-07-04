const jwt = require('jsonwebtoken');
const User = require('../models/User');

const sendError = (res, statusCode, message, code) => {
    return res.status(statusCode).json({ success: false, data: null, error: { code, message } });
};

/**
 * @middleware  protect
 * @desc        Validates the JWT access token from the Authorization header.
 *              Attaches { id, role } to req.user on success.
 */
const protect = async (req, res, next) => {
    try {
        let token;
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
        } else if (req.query && req.query.token) {
            token = req.query.token;
        }

        if (!token) {
            return sendError(res, 401, 'No access token provided.', 'NO_TOKEN');
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Attach lightweight user context (avoids a DB hit on every request)
        req.user = { id: decoded.id, role: decoded.role };

        next();
    } catch (err) {
        console.error('[AUTH] protect middleware failed', {
            requestId: req.requestId,
            code: err?.name || 'UNKNOWN',
            message: err?.message || String(err),
        });
        if (err.name === 'TokenExpiredError') {
            return sendError(res, 401, 'Access token has expired.', 'TOKEN_EXPIRED');
        }
        return sendError(res, 401, 'Invalid access token.', 'TOKEN_INVALID');
    }
};

/**
 * @middleware  authorizeRoles
 * @desc        RBAC guard — restrict access to specific roles.
 *              Must be used AFTER `protect` middleware.
 * @example     router.get('/admin-only', protect, authorizeRoles('admin'), handler)
 */
const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return sendError(
                res,
                403,
                `Access denied. Required role(s): ${roles.join(', ')}.`,
                'FORBIDDEN'
            );
        }
        next();
    };
};

// authorizeRoles is the canonical name; `authorize` is kept as a backward-compatible alias
// so existing routes that import `{ protect, authorize }` continue to work unchanged.
const authorize = authorizeRoles;

module.exports = { protect, authorizeRoles, authorize };
