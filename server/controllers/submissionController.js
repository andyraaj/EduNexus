const submissionService = require('../services/submissionService');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');

const submitAssignment = asyncHandler(async (req, res) => {
    const { assignmentId, fileUrl } = req.body;
    if (!assignmentId || !fileUrl) {
        throw ApiError.badRequest('assignmentId and fileUrl are required.');
    }
    const submission = await submissionService.submitAssignment(req.user.id, assignmentId, fileUrl);
    return ApiResponse.success(res, 201, { submission }, 'Assignment submitted successfully.');
});

const getSubmissionsForAssignment = asyncHandler(async (req, res) => {
    const submissions = await submissionService.getSubmissionsForAssignment(req.user.id, req.params.assignmentId);
    return ApiResponse.success(res, 200, { submissions });
});

const getMySubmission = asyncHandler(async (req, res) => {
    const submission = await submissionService.getMySubmission(req.user.id, req.params.assignmentId);
    return ApiResponse.success(res, 200, { submission });
});

const getAllMySubmissions = asyncHandler(async (req, res) => {
    const submissions = await submissionService.getAllMySubmissions(req.user.id);
    return ApiResponse.success(res, 200, { submissions });
});

const gradeSubmission = asyncHandler(async (req, res) => {
    const { marksAwarded, feedback } = req.body;
    if (marksAwarded === undefined) {
        throw ApiError.badRequest('marksAwarded is required.');
    }
    const submission = await submissionService.gradeSubmission(req.user.id, req.params.id, marksAwarded, feedback);
    return ApiResponse.success(res, 200, { submission }, 'Graded successfully.');
});

module.exports = { submitAssignment, getSubmissionsForAssignment, getMySubmission, getAllMySubmissions, gradeSubmission };
