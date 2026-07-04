const mongoose = require('mongoose');

/**
 * QuizAttempt — records a student's attempt at a quiz.
 * References User._id (not Student._id) for consistency.
 */
const quizAttemptSchema = new mongoose.Schema({
    quiz: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Quiz',
        required: true
    },
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Changed from 'Student' → 'User' for consistency
        required: true
    },
    // Map questionId -> selectedOptionIndex
    answers: {
        type: Map,
        of: Number,
        default: {}
    },
    score: {
        type: Number,
        default: 0
    },
    startTime: {
        type: Date,
        default: Date.now
    },
    endTime: {
        type: Date,
        default: null
    }
}, { timestamps: true });

// Ensure one attempt per student per quiz
quizAttemptSchema.index({ quiz: 1, student: 1 }, { unique: true });

module.exports = mongoose.model('QuizAttempt', quizAttemptSchema);
