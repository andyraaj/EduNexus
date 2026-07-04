/**
 * Standardized API response helper.
 * Ensures all responses across all controllers use the same envelope format:
 *   { success: true/false, data: ..., error: ..., meta: ..., requestId: ... }
 *
 * Usage:
 *   return ApiResponse.success(res, 200, { course }, 'Course created.');
 *   return ApiResponse.success(res, 200, { courses }, 'Fetched.', { page, totalPages });
 */
class ApiResponse {
    /**
     * Send a success response.
     * @param {import('express').Response} res
     * @param {number} statusCode
     * @param {*} data
     * @param {string} message
     * @param {object} [meta] - Optional pagination/meta info
     */
    static success(res, statusCode, data, message = 'Success', meta = undefined) {
        const body = {
            success: true,
            message,
            data,
            error: null,
            requestId: res.req?.requestId,
        };
        if (meta) body.meta = meta;
        return res.status(statusCode).json(body);
    }

    /**
     * Send an error response.
     * @param {import('express').Response} res
     * @param {number} statusCode
     * @param {string} code
     * @param {string} message
     * @param {object} [data] - Optional data to include (e.g., conflict details)
     */
    static error(res, statusCode, code = 'ERROR', message = 'An error occurred.', data = null) {
        return res.status(statusCode).json({
            success: false,
            data,
            error: { code, message },
            requestId: res.req?.requestId,
        });
    }
}

module.exports = ApiResponse;
