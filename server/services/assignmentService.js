const Assignment = require('../models/Assignment');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const { notifyCourseStudents } = require('./notificationService');
const ApiError = require('../utils/ApiError');

/**
 * Check if a user has access to a course's assignments.
 * Since primaryFaculty now stores User._id, no Faculty profile lookup needed.
 */
const checkCourseAccess = async (userId, userRole, courseId) => {
    if (userRole === 'admin') return true;

    if (userRole === 'faculty') {
        const course = await Course.findById(courseId);
        if (!course) throw ApiError.notFound('Course not found.');
        // primaryFaculty = User._id — compare directly
        if (!course.primaryFaculty || course.primaryFaculty.toString() !== userId.toString()) {
            throw ApiError.forbidden('You are not authorized to access this course.');
        }
        return true;
    }

    if (userRole === 'student') {
        // Enrollment.student = User._id — compare directly
        const isEnrolled = await Enrollment.exists({ student: userId, course: courseId, status: 'enrolled' });
        if (!isEnrolled) throw ApiError.forbidden('You must be enrolled in this course to access assignments.');
        return true;
    }
};

const getAssignmentsByCourse = async (userId, userRole, courseId) => {
    await checkCourseAccess(userId, userRole, courseId);
    return Assignment.find({ course: courseId })
        .populate('course', 'code title')
        .populate('faculty', 'name email')
        .sort({ dueDate: 1 });
};

const createAssignment = async (userId, courseId, data) => {
    const course = await Course.findById(courseId);
    if (!course) throw ApiError.notFound('Course not found.');

    // primaryFaculty = User._id — compare directly
    if (!course.primaryFaculty || course.primaryFaculty.toString() !== userId.toString()) {
        throw ApiError.forbidden('You are not authorized to create assignments for this course.');
    }

    // Assignment.faculty refs User — store User._id
    const assignment = await Assignment.create({
        course: courseId,
        faculty: userId,
        title: data.title,
        description: data.description,
        dueDate: data.dueDate,
        maxMarks: data.maxMarks,
        attachmentUrl: data.attachmentUrl,
    });

    // Notify all enrolled students in real-time
    await notifyCourseStudents(
        courseId,
        'assignment_created',
        `📋 New Assignment: "${data.title}" — due ${new Date(data.dueDate).toLocaleDateString('en-IN')}`,
        '/student/assignments'
    );

    return assignment;
};

const updateAssignment = async (userId, assignmentId, data) => {
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) throw ApiError.notFound('Assignment not found.');
    // Assignment.faculty stores User._id
    if (assignment.faculty.toString() !== userId.toString()) {
        throw ApiError.forbidden('You can only edit your own assignments.');
    }

    if (data.title !== undefined) assignment.title = data.title;
    if (data.description !== undefined) assignment.description = data.description;
    if (data.dueDate !== undefined) assignment.dueDate = data.dueDate;
    if (data.maxMarks !== undefined) assignment.maxMarks = data.maxMarks;
    if (data.attachmentUrl !== undefined) assignment.attachmentUrl = data.attachmentUrl;

    await assignment.save();

    await notifyCourseStudents(
        assignment.course.toString(),
        'assignment_created',
        `✏️ Assignment Updated: "${assignment.title}" — check the new details.`,
        '/student/assignments'
    );

    return assignment;
};

const deleteAssignment = async (userId, assignmentId) => {
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) throw ApiError.notFound('Assignment not found.');
    if (assignment.faculty.toString() !== userId.toString()) {
        throw ApiError.forbidden('You can only delete your own assignments.');
    }
    await Assignment.findByIdAndDelete(assignmentId);
};

module.exports = {
    getAssignmentsByCourse,
    createAssignment,
    updateAssignment,
    deleteAssignment,
};
