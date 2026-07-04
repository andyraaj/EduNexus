/**
 * Global error handler middleware.
 * Catches all errors thrown in route handlers (especially when using asyncHandler)
 * and returns a standardized JSON response.
 *
 * Must be registered AFTER all routes in server.js:
 *   app.use(errorHandler);
 */
const errorHandler = (err, req, res, _next) => {
    // Default values
    let statusCode = err.statusCode || err.status || 500;
    let code = err.code || 'SERVER_ERROR';
    let message = err.message || 'An internal server error occurred.';

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        statusCode = 400;
        code = 'VALIDATION_ERROR';
        const messages = Object.values(err.errors).map(e => e.message);
        message = messages.join('; ');
    }

    // Mongoose duplicate key error
    if (err.code === 11000) {
        statusCode = 409;
        code = 'DUPLICATE_KEY';
        const field = Object.keys(err.keyValue || {}).join(', ');
        message = `Duplicate value for field: ${field}`;
    }

    // Mongoose cast error (invalid ObjectId)
    if (err.name === 'CastError') {
        statusCode = 400;
        code = 'INVALID_ID';
        message = `Invalid ${err.path}: ${err.value}`;
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        code = 'INVALID_TOKEN';
        message = 'Invalid token.';
    }

    if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        code = 'TOKEN_EXPIRED';
        message = 'Token has expired.';
    }

    // Log server errors (not operational/expected)
    if (statusCode >= 500) {
        console.error(`[ERROR] ${req.method} ${req.originalUrl}:`, err);
    }

    res.status(statusCode).json({
        success: false,
        data: null,
        error: { code, message },
        requestId: req.requestId,
    });
};

module.exports = errorHandler;
