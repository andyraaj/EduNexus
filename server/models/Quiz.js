const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
    questionId: {
        type: String,
        required: true,
        default: () => new mongoose.Types.ObjectId().toString(),
    },
    text: {
        type: String,
        required: true,
        trim: true,
    },
    options: [{
        type: String,
        required: true,
    }],
    correctOptionIndex: {
        type: Number,
        required: true,
        min: 0,
    }
});

const quizSchema = new mongoose.Schema({
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
    timeLimitMinutes: {
        type: Number,
        required: true,
        min: 1,
    },
    isActive: {
        type: Boolean,
        default: false,
    },
    questions: [questionSchema],
}, { timestamps: true });

quizSchema.index({ course: 1, isActive: 1 });

module.exports = mongoose.model('Quiz', quizSchema);
