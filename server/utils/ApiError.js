/**
 * Custom API error class with HTTP status code support.
 *
 * Usage:
 *   throw new ApiError(404, 'Course not found', 'NOT_FOUND');
 *   throw ApiError.badRequest('Email is required');
 *   throw ApiError.unauthorized('Invalid token');
 */
class ApiError extends Error {
    constructor(statusCode, message, code = 'ERROR') {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = true; // Distinguishes from programming errors
        Error.captureStackTrace(this, this.constructor);
    }

    static badRequest(message, code = 'BAD_REQUEST') {
        return new ApiError(400, message, code);
    }

    static unauthorized(message = 'Unauthorized', code = 'UNAUTHORIZED') {
        return new ApiError(401, message, code);
    }

    static forbidden(message = 'Forbidden', code = 'FORBIDDEN') {
        return new ApiError(403, message, code);
    }

    static notFound(message = 'Resource not found', code = 'NOT_FOUND') {
        return new ApiError(404, message, code);
    }

    static conflict(message, code = 'CONFLICT') {
        return new ApiError(409, message, code);
    }

    static internal(message = 'Internal server error', code = 'SERVER_ERROR') {
        return new ApiError(500, message, code);
    }
}

module.exports = ApiError;
