const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    amountDue: {
        type: Number,
        required: true,
        min: 0,
    },
    amountPaid: {
        type: Number,
        default: 0,
        min: 0,
    },
    dueDate: {
        type: Date,
        required: true,
    },
    status: {
        type: String,
        enum: ['pending', 'paid_partial', 'paid_full'],
        default: 'pending',
    },
    type: {
        type: String,
        enum: ['tuition', 'library_fine', 'hostel', 'other'],
        required: true,
    },
    description: {
        type: String,
        trim: true,
    },
}, { timestamps: true });

// Index for getting student invoices fast and filtering by status
invoiceSchema.index({ student: 1, status: 1 });

module.exports = mongoose.model('Invoice', invoiceSchema);
