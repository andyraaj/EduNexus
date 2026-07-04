const mongoose = require('mongoose');

const examEventSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, 'Exam title is required'],
            trim: true,
        },
        course: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Course',
            default: null,
        },
        type: {
            type: String,
            enum: ['internal', 'midterm', 'final', 'practical', 'viva', 'assignment', 'event'],
            default: 'internal',
        },
        startsAt: {
            type: Date,
            required: [true, 'Start date/time is required'],
        },
        endsAt: {
            type: Date,
            required: [true, 'End date/time is required'],
        },
        venue: {
            type: String,
            trim: true,
            default: '',
        },
        instructions: {
            type: String,
            trim: true,
            default: '',
        },
        targetAudience: {
            type: String,
            enum: ['all', 'student', 'faculty'],
            default: 'all',
        },
        status: {
            type: String,
            enum: ['draft', 'published', 'cancelled'],
            default: 'published',
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
    },
    { timestamps: true }
);

examEventSchema.index({ startsAt: 1, status: 1 });
examEventSchema.index({ course: 1, startsAt: 1 });
examEventSchema.index({ targetAudience: 1, status: 1 });

module.exports = mongoose.model('ExamEvent', examEventSchema);
