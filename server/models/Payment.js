const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    invoice: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Invoice',
        required: true,
    },
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Changed from 'Student' → 'User' to match Invoice.student ref
        required: true,
    },
    amount: {
        type: Number,
        required: true,
        min: 1, // Must be > 0 amount
    },
    paymentDate: {
        type: Date,
        default: Date.now,
    },
    transactionId: {
        type: String,
        trim: true,
        required: true,
        unique: true, // E.g., Razorpay/Stripe txn ID
    },
    method: {
        type: String,
        enum: ['credit_card', 'debit_card', 'net_banking', 'upi', 'cash', 'bank_transfer'],
        required: true,
    },
}, { timestamps: true });

paymentSchema.index({ student: 1, paymentDate: -1 });
paymentSchema.index({ invoice: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
