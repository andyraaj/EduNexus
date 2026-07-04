const mongoose = require('mongoose');

const leaveRequestSchema = new mongoose.Schema(
    {
        faculty: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        leaveType: {
            type: String,
            required: true,
            enum: ['casual', 'sick', 'earned', 'maternity', 'paternity'],
        },
        startDate: {
            type: Date,
            required: true,
        },
        endDate: {
            type: Date,
            required: true,
        },
        reason: {
            type: String,
            required: true,
            trim: true,
        },
        alternativeClassArrangement: {
            type: String,
            default: '',
            trim: true,
        },
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: 'pending',
        },
        comments: {
            type: String,
            default: '',
            trim: true,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('LeaveRequest', leaveRequestSchema);
