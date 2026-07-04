const mongoose = require('mongoose');

const doubtQuerySchema = new mongoose.Schema(
    {
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        course: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Course',
            required: true,
        },
        title: {
            type: String,
            required: [true, 'Doubt title is required'],
            trim: true,
        },
        description: {
            type: String,
            required: [true, 'Doubt description is required'],
            trim: true,
        },
        status: {
            type: String,
            enum: ['open', 'resolved'],
            default: 'open',
        },
        replies: [
            {
                user: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'User',
                    required: true,
                },
                message: {
                    type: String,
                    required: true,
                },
                timestamp: {
                    type: Date,
                    default: Date.now,
                },
            },
        ],
    },
    { timestamps: true }
);

module.exports = mongoose.model('DoubtQuery', doubtQuerySchema);
