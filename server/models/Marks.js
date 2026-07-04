const mongoose = require('mongoose');

/**
 * Marks — tracks individual assessment scores for students.
 * Unified to reference User and Course (not legacy Student/Subject).
 */
const marksSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Changed from 'Student' → 'User' for consistency
        required: true
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course', // Changed from 'Subject' → 'Course' (Subject is deprecated)
        required: true
    },
    examType: {
        type: String,
        required: true // e.g., 'Internal 1', 'Mid-Sem', 'Final'
    },
    score: {
        type: Number,
        required: true
    },
    maxScore: {
        type: Number,
        required: true
    }
}, { timestamps: true });

// Indexes
marksSchema.index({ student: 1, course: 1, examType: 1 }, { unique: true });
marksSchema.index({ course: 1, examType: 1 });

module.exports = mongoose.model('Marks', marksSchema);
