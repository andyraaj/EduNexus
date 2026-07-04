const Payment = require('../models/Payment');
const Invoice = require('../models/Invoice');
const ApiError = require('../utils/ApiError');

/**
 * Process a payment against an invoice.
 * Payment.student = User._id, Invoice.student = User._id — fully consistent.
 * No Student profile lookup needed.
 */
const processPayment = async (userId, userRole, data) => {
    let payerUserId;

    if (userRole === 'student') {
        payerUserId = userId; // User._id directly
    } else if (userRole === 'admin') {
        payerUserId = data.studentId; // Admin passes User._id of student
        if (!payerUserId) throw ApiError.badRequest('Must provide studentId when recording as admin.');
    } else {
        throw ApiError.forbidden('Unauthorized payment action.');
    }

    const invoice = await Invoice.findById(data.invoiceId);
    if (!invoice) throw ApiError.notFound('Invoice not found.');
    // Invoice.student = User._id — compare directly
    if (invoice.student.toString() !== payerUserId.toString()) {
        throw ApiError.badRequest('Invoice does not belong to this student.');
    }

    if (invoice.status === 'paid_full') throw ApiError.badRequest('Invoice is already paid in full.');

    const amountToPay = Number(data.amount);
    if (isNaN(amountToPay) || amountToPay <= 0) throw ApiError.badRequest('Invalid amount.');

    const remaining = invoice.amountDue - invoice.amountPaid;
    if (amountToPay > remaining) {
        throw ApiError.badRequest(`Payment exceeds remaining balance of ${remaining}.`);
    }

    // 1. Create Payment Record — Payment.student = User._id
    const payment = await Payment.create({
        invoice: invoice._id,
        student: payerUserId, // User._id
        amount: amountToPay,
        transactionId: data.transactionId,
        method: data.method,
    });

    // 2. Update Invoice Status
    invoice.amountPaid += amountToPay;
    if (invoice.amountPaid >= invoice.amountDue) {
        invoice.status = 'paid_full';
    } else {
        invoice.status = 'paid_partial';
    }
    await invoice.save();

    return payment;
};

/**
 * Get payment history for the logged-in student.
 * Payment.student = User._id — query directly.
 */
const getMyPaymentHistory = async (userId) => {
    return Payment.find({ student: userId }) // User._id directly
        .populate('invoice', 'type amountDue description')
        .sort({ paymentDate: -1 });
};

/**
 * Get all payments (admin view).
 * Payment.student = User._id — populate User directly.
 */
const getAllPaymentsAdmin = async () => {
    return Payment.find()
        .populate('student', 'name email') // User fields directly
        .populate('invoice', 'type amountDue description')
        .sort({ paymentDate: -1 });
};

module.exports = {
    processPayment,
    getMyPaymentHistory,
    getAllPaymentsAdmin
};
