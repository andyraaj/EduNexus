const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema(
    {
        assignment: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Assignment',
            required: true,
        },
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        fileUrl: {
            type: String,
            required: true,
        },
        submittedAt: {
            type: Date,
            default: Date.now,
        },
        marksAwarded: {
            type: Number,
            default: null,
            min: 0,
        },
        feedback: {
            type: String,
            default: '',
        },
    },
    { timestamps: true }
);

// To ensure a student can only submit once per assignment (or we take the latest, but let's enforce single submission doc)
submissionSchema.index({ assignment: 1, student: 1 }, { unique: true });
// For faculty viewing all submissions for an assignment
submissionSchema.index({ assignment: 1, submittedAt: -1 });

module.exports = mongoose.model('Submission', submissionSchema);
