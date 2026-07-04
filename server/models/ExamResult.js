const mongoose = require('mongoose');

const examResultSchema = new mongoose.Schema(
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
        academicYear: {
            type: String,
            required: true,
            trim: true,
        },
        semester: {
            type: Number,
            required: true,
            min: 1,
            max: 12,
        },
        assessmentType: {
            type: String,
            enum: ['internal', 'midterm', 'final', 'practical', 'viva', 'assignment', 'quiz'],
            default: 'internal',
        },
        assessmentTitle: {
            type: String,
            required: true,
            trim: true,
        },
        score: {
            type: Number,
            required: true,
            min: 0,
        },
        maxScore: {
            type: Number,
            required: true,
            min: 1,
        },
        grade: {
            type: String,
            default: '',
            trim: true,
        },
        remarks: {
            type: String,
            default: '',
            trim: true,
        },
        status: {
            type: String,
            enum: ['draft', 'published'],
            default: 'draft',
        },
        moderationStatus: {
            type: String,
            enum: ['pending', 'approved', 'locked'],
            default: 'pending',
        },
        enteredBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        moderatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        moderatedAt: {
            type: Date,
            default: null,
        },
        publishedAt: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true }
);

examResultSchema.index(
    { student: 1, course: 1, academicYear: 1, semester: 1, assessmentType: 1, assessmentTitle: 1 },
    { unique: true }
);
examResultSchema.index({ course: 1, academicYear: 1, semester: 1, status: 1 });
examResultSchema.index({ student: 1, academicYear: 1, semester: 1, status: 1 });

module.exports = mongoose.model('ExamResult', examResultSchema);
