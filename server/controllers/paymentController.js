const paymentService = require('../services/paymentService');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');

const processPayment = asyncHandler(async (req, res) => {
    const payment = await paymentService.processPayment(req.user.id, req.user.role, req.body);
    return ApiResponse.success(res, 201, { payment }, 'Payment recorded successfully.');
});

const getHistory = asyncHandler(async (req, res) => {
    if (req.user.role === 'student') {
        const payments = await paymentService.getMyPaymentHistory(req.user.id);
        return ApiResponse.success(res, 200, { payments });
    } else if (req.user.role === 'admin') {
        const payments = await paymentService.getAllPaymentsAdmin();
        return ApiResponse.success(res, 200, { payments });
    }
    throw ApiError.forbidden('Not authorized.');
});

module.exports = { processPayment, getHistory };
