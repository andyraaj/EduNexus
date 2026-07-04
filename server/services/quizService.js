const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const { notifyCourseStudents } = require('./notificationService');
const ApiError = require('../utils/ApiError');

/**
 * Get quizzes for a course (role-aware).
 * All refs are now User._id — no Student/Faculty profile lookups needed.
 */
const getQuizzesByCourse = async (userId, userRole, courseId) => {
    if (userRole === 'faculty') {
        const course = await Course.findById(courseId);
        if (!course || !course.primaryFaculty || course.primaryFaculty.toString() !== userId.toString()) {
            throw ApiError.forbidden('Not authorized to view quizzes for this course.');
        }
        return Quiz.find({ course: courseId }).sort({ createdAt: -1 });
    }

    if (userRole === 'student') {
        // Enrollment.student = User._id
        const isEnrolled = await Enrollment.exists({ student: userId, course: courseId, status: 'enrolled' });
        if (!isEnrolled) throw ApiError.forbidden('Must be enrolled to view quizzes.');
        // Omit correctOptionIndex to prevent cheating
        return Quiz.find({ course: courseId, isActive: true }, { 'questions.correctOptionIndex': 0 }).sort({ createdAt: -1 });
    }

    if (userRole === 'admin') {
        return Quiz.find({ course: courseId }).sort({ createdAt: -1 });
    }
};

/**
 * Create a quiz. Quiz.faculty = User._id.
 */
const createQuiz = async (userId, data) => {
    const course = await Course.findById(data.courseId);
    if (!course || !course.primaryFaculty || course.primaryFaculty.toString() !== userId.toString()) {
        throw ApiError.forbidden('Not authorized to create quizzes for this course.');
    }

    const quiz = await Quiz.create({
        course: data.courseId,
        faculty: userId, // User._id directly
        title: data.title,
        description: data.description || '',
        timeLimitMinutes: data.timeLimitMinutes,
        isActive: data.isActive || false,
        questions: data.questions || [],
    });

    if (quiz.isActive) {
        await notifyCourseStudents(data.courseId, 'quiz_created', `New Quiz Available: ${quiz.title}`, `/student/quizzes`);
    }

    return quiz;
};

/**
 * Update a quiz. Quiz.faculty = User._id — compare directly.
 */
const updateQuiz = async (userId, quizId, data) => {
    const quiz = await Quiz.findById(quizId);
    if (!quiz) throw ApiError.notFound('Quiz not found');

    // Quiz.faculty = User._id — direct comparison
    if (quiz.faculty.toString() !== userId.toString()) {
        throw ApiError.forbidden('You can only update your own quizzes.');
    }

    const hasAttempts = await QuizAttempt.exists({ quiz: quizId });
    if (hasAttempts && data.questions) {
        throw ApiError.badRequest('Cannot modify questions after students have started attempts.');
    }

    if (data.title) quiz.title = data.title;
    if (data.description !== undefined) quiz.description = data.description;
    if (data.timeLimitMinutes) quiz.timeLimitMinutes = data.timeLimitMinutes;
    if (data.isActive !== undefined) {
        if (!quiz.isActive && data.isActive) {
            await notifyCourseStudents(quiz.course.toString(), 'quiz_created', `New Quiz Available: ${quiz.title}`, `/student/quizzes`);
        }
        quiz.isActive = data.isActive;
    }
    if (data.questions && !hasAttempts) quiz.questions = data.questions;

    await quiz.save();
    return quiz;
};

/**
 * Delete a quiz and all its attempts.
 */
const deleteQuiz = async (userId, quizId) => {
    const quiz = await Quiz.findById(quizId);
    if (!quiz) throw ApiError.notFound('Quiz not found');
    if (quiz.faculty.toString() !== userId.toString()) {
        throw ApiError.forbidden('You can only delete your own quizzes.');
    }

    await Quiz.findByIdAndDelete(quizId);
    await QuizAttempt.deleteMany({ quiz: quizId });
};

module.exports = {
    getQuizzesByCourse,
    createQuiz,
    updateQuiz,
    deleteQuiz,
};
