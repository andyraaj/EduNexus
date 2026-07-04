const express = require('express');
const router = express.Router();
const Invoice = require('../models/Invoice');
const { protect, authorize } = require('../middleware/authMiddleware');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');

// @desc    Get Invoices for logged in student
// @route   GET /api/billing/my
// Invoice.student = User._id — query directly, no Student profile lookup needed
router.get('/my', protect, authorize('student'), asyncHandler(async (req, res) => {
    const invoices = await Invoice.find({ student: req.user.id }).sort({ dueDate: 1 });
    return ApiResponse.success(res, 200, { invoices }, 'Invoices fetched.');
}));

// @desc    Pay an invoice
// @route   POST /api/billing/pay/:id
router.post('/pay/:id', protect, authorize('student'), asyncHandler(async (req, res) => {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) throw ApiError.notFound('Invoice not found.');

    // Invoice.student = User._id — compare directly
    if (invoice.student.toString() !== req.user.id.toString()) {
        throw ApiError.forbidden('Not authorized to pay this invoice.');
    }

    if (invoice.status === 'paid_full') {
        throw ApiError.badRequest('Invoice already paid in full.');
    }

    // Mock Payment Processing
    invoice.amountPaid = invoice.amountDue;
    invoice.status = 'paid_full';
    await invoice.save();

    return ApiResponse.success(res, 200, { invoice }, 'Payment successful.');
}));

module.exports = router;
