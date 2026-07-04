const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema(
    {
        course: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Course',
            required: true,
        },
        faculty: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        title: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            trim: true,
            default: '',
        },
        dueDate: {
            type: Date,
            required: true,
        },
        maxMarks: {
            type: Number,
            required: true,
            min: 1,
        },
        attachmentUrl: {
            type: String,
            default: null, // Optional assignment prompt/file
        },
        notified1Day: {
            type: Boolean,
            default: false,
        },
        notified1Hour: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

// Indexes to quickly find assignments for a course, sorted by due date
assignmentSchema.index({ course: 1, dueDate: 1 });

module.exports = mongoose.model('Assignment', assignmentSchema);
