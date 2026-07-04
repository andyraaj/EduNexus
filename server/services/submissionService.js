const Submission = require('../models/Submission');
const Assignment = require('../models/Assignment');
const Enrollment = require('../models/Enrollment');
const ApiError = require('../utils/ApiError');

/**
 * Submit an assignment (student).
 * Submission.student = User._id, Enrollment.student = User._id.
 * No Student profile lookup needed.
 */
const submitAssignment = async (userId, assignmentId, fileUrl) => {
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) throw ApiError.notFound('Assignment not found.');

    // Check enrollment using User._id directly
    const isEnrolled = await Enrollment.exists({ student: userId, course: assignment.course, status: 'enrolled' });
    if (!isEnrolled) throw ApiError.forbidden('You must be enrolled in the course to submit this assignment.');

    // Upsert: allow resubmission until due date
    let submission = await Submission.findOne({ assignment: assignmentId, student: userId });

    if (submission) {
        submission.fileUrl = fileUrl;
        submission.submittedAt = Date.now();
        await submission.save();
    } else {
        submission = await Submission.create({
            assignment: assignmentId,
            student: userId, // User._id
            fileUrl,
        });
    }

    return submission;
};

/**
 * Faculty fetching all submissions for their assignment.
 * Assignment.faculty = User._id — compare directly.
 */
const getSubmissionsForAssignment = async (userId, assignmentId) => {
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) throw ApiError.notFound('Assignment not found.');

    // Assignment.faculty = User._id — direct comparison
    if (assignment.faculty.toString() !== userId.toString()) {
        throw ApiError.forbidden('You are not authorized to view these submissions.');
    }

    return Submission.find({ assignment: assignmentId })
        .populate('student', 'name email') // User fields directly
        .sort({ submittedAt: -1 });
};

/**
 * Student fetching their own submission.
 * Submission.student = User._id — query directly.
 */
const getMySubmission = async (userId, assignmentId) => {
    return Submission.findOne({ assignment: assignmentId, student: userId });
};

/**
 * Faculty grades a submission.
 * Assignment.faculty = User._id — compare directly.
 */
const gradeSubmission = async (userId, submissionId, marksAwarded, feedback) => {
    const submission = await Submission.findById(submissionId).populate('assignment');
    if (!submission) throw ApiError.notFound('Submission not found.');

    // Assignment.faculty = User._id — direct comparison
    if (submission.assignment?.faculty?.toString() !== userId.toString()) {
        throw ApiError.forbidden('You are not authorized to grade this submission.');
    }

    if (marksAwarded > submission.assignment.maxMarks) {
        throw ApiError.badRequest(`Marks cannot exceed the max marks: ${submission.assignment.maxMarks}`);
    }

    submission.marksAwarded = marksAwarded;
    submission.feedback = feedback || '';
    await submission.save();

    // Notify the student
    const { createDirectNotification } = require('./notificationService');
    // submission.student is User._id directly
    await createDirectNotification(
        submission.student,
        'submission_graded',
        `Your submission for "${submission.assignment.title}" was graded: ${marksAwarded} marks.`,
        '/student/assignments'
    );

    return submission.populate('student', 'name email');
};

/**
 * Student fetching all their submissions.
 * Submission.student = User._id — query directly.
 */
const getAllMySubmissions = async (userId) => {
    return Submission.find({ student: userId })
        .populate({
            path: 'assignment',
            select: 'title maxMarks dueDate course description',
            populate: { path: 'course', select: 'code title' }
        })
        .sort({ submittedAt: -1 });
};

module.exports = {
    submitAssignment,
    getSubmissionsForAssignment,
    getMySubmission,
    getAllMySubmissions,
    gradeSubmission,
};
