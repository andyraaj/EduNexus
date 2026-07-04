const quizService = require('../services/quizService');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');

const getQuizzesByCourse = asyncHandler(async (req, res) => {
    const quizzes = await quizService.getQuizzesByCourse(req.user.id, req.user.role, req.params.courseId);
    return ApiResponse.success(res, 200, { quizzes });
});

const createQuiz = asyncHandler(async (req, res) => {
    const quiz = await quizService.createQuiz(req.user.id, req.body);
    return ApiResponse.success(res, 201, { quiz }, 'Quiz created successfully.');
});

const updateQuiz = asyncHandler(async (req, res) => {
    const quiz = await quizService.updateQuiz(req.user.id, req.params.id, req.body);
    return ApiResponse.success(res, 200, { quiz }, 'Quiz updated.');
});

const deleteQuiz = asyncHandler(async (req, res) => {
    await quizService.deleteQuiz(req.user.id, req.params.id);
    return ApiResponse.success(res, 200, null, 'Quiz deleted.');
});

module.exports = { getQuizzesByCourse, createQuiz, updateQuiz, deleteQuiz };
