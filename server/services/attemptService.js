const QuizAttempt = require('../models/QuizAttempt');
const Quiz = require('../models/Quiz');
const Enrollment = require('../models/Enrollment');
const ApiError = require('../utils/ApiError');

/**
 * Start a quiz attempt.
 * QuizAttempt.student = User._id, Enrollment.student = User._id.
 * No Student profile lookup needed.
 */
const startQuiz = async (userId, quizId) => {
    const quiz = await Quiz.findById(quizId);
    if (!quiz || !quiz.isActive) throw ApiError.notFound('Active quiz not found.');

    // Enrollment check using User._id directly
    const isEnrolled = await Enrollment.exists({ student: userId, course: quiz.course, status: 'enrolled' });
    if (!isEnrolled) throw ApiError.forbidden('You must be enrolled to take this quiz.');

    // Enforce 1 attempt per student
    let attempt = await QuizAttempt.findOne({ quiz: quizId, student: userId });
    if (attempt) {
        if (attempt.endTime) throw ApiError.badRequest('You have already completed this quiz.');
        return attempt; // Resume in-progress attempt
    }

    attempt = await QuizAttempt.create({
        quiz: quizId,
        student: userId, // User._id
        startTime: Date.now(),
        endTime: null,
        answers: {},
        score: 0
    });

    return attempt;
};

/**
 * Submit a quiz attempt with answers.
 */
const submitQuiz = async (userId, quizId, answers) => {
    const attempt = await QuizAttempt.findOne({ quiz: quizId, student: userId });
    if (!attempt) throw ApiError.notFound('Active attempt not found. Please start the quiz first.');
    if (attempt.endTime) throw ApiError.badRequest('Quiz has already been submitted.');

    const quiz = await Quiz.findById(quizId);
    if (!quiz) throw ApiError.notFound('Quiz not found.');

    // Check time limit with a small grace period (2 minutes)
    const now = Date.now();
    const elapsedTimeMin = (now - attempt.startTime.getTime()) / 60000;
    if (elapsedTimeMin > quiz.timeLimitMinutes + 2) {
        attempt.endTime = now;
        await attempt.save();
        throw ApiError.badRequest('Time limit exceeded. Your previous answers have been submitted automatically.');
    }

    // Calculate score
    let score = 0;
    const recordedAnswers = {};

    // answers expected to be an object map: { questionId: selectedIndex }
    for (const [qId, selectedIdx] of Object.entries(answers)) {
        recordedAnswers[qId] = selectedIdx;
    }

    for (const q of quiz.questions) {
        const answerVal = recordedAnswers[q._id.toString()];
        if (answerVal !== undefined && answerVal === q.correctOptionIndex) {
            score += 1;
        }
    }

    attempt.answers = recordedAnswers;
    attempt.score = score;
    attempt.endTime = now;

    await attempt.save();

    return {
        score,
        totalQuestions: quiz.questions.length,
        attemptId: attempt._id
    };
};

/**
 * Get all quiz attempts for the logged-in student.
 */
const getMyAttempts = async (userId) => {
    return QuizAttempt.find({ student: userId }) // User._id directly
        .populate('quiz', 'title course timeLimitMinutes questions')
        .sort({ startTime: -1 });
};

/**
 * Get all attempts for a specific quiz (faculty view).
 * Quiz.faculty = User._id — compare directly.
 */
const getQuizAttemptsForFaculty = async (userId, quizId) => {
    const quiz = await Quiz.findById(quizId);
    if (!quiz) throw ApiError.notFound('Quiz not found.');
    // Quiz.faculty = User._id — direct comparison
    if (quiz.faculty.toString() !== userId.toString()) {
        throw ApiError.forbidden('Unauthorized to view this quiz.');
    }

    return QuizAttempt.find({ quiz: quizId })
        .populate('student', 'name email') // User fields directly
        .sort({ score: -1 });
};

module.exports = {
    startQuiz,
    submitQuiz,
    getMyAttempts,
    getQuizAttemptsForFaculty,
};
