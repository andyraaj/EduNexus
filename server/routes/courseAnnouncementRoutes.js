const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const CourseAnnouncement = require('../models/CourseAnnouncement');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');

// ── GET /api/v1/course-announcements/course/:courseId ─────────────────────────
// Returns all visible announcements for a course (students must be enrolled)
router.get('/course/:courseId', protect, asyncHandler(async (req, res) => {
    const { courseId } = req.params;
    const { id: userId, role } = req.user;

    if (role === 'student') {
        const enrolled = await Enrollment.exists({ student: userId, course: courseId, status: 'enrolled' });
        if (!enrolled) throw ApiError.forbidden('You are not enrolled in this course.');
    } else if (role === 'faculty') {
        const course = await Course.findById(courseId);
        if (!course || course.primaryFaculty?.toString() !== userId) {
            throw ApiError.forbidden('You are not assigned to this course.');
        }
    }

    const announcements = await CourseAnnouncement.find({ course: courseId })
        .populate('postedBy', 'name email')
        .sort({ isPinned: -1, createdAt: -1 })
        .limit(50);

    return ApiResponse.success(res, 200, { announcements });
}));

// ── POST /api/v1/course-announcements ─────────────────────────────────────────
// Faculty posts a new announcement
router.post('/', protect, authorize('faculty', 'admin'), asyncHandler(async (req, res) => {
    const { courseId, title, body, priority, isPinned, attachmentUrl } = req.body;
    if (!courseId || !title || !body) {
        throw ApiError.badRequest('courseId, title, and body are required.');
    }

    const course = await Course.findById(courseId);
    if (!course) throw ApiError.notFound('Course not found.');

    if (req.user.role === 'faculty') {
        if (course.primaryFaculty?.toString() !== req.user.id) {
            throw ApiError.forbidden('You are not assigned to this course.');
        }
    }

    const ann = await CourseAnnouncement.create({
        course: courseId,
        postedBy: req.user.id,
        title,
        body,
        priority: priority || 'normal',
        isPinned: isPinned || false,
        attachmentUrl: attachmentUrl || null,
    });

    const populated = await ann.populate('postedBy', 'name email');

    // Trigger real-time notification for enrolled students
    try {
        const { notifyCourseStudents } = require('../services/notificationService');
        const courseCode = course.code || 'Course';
        notifyCourseStudents(
            courseId,
            'course_announcement',
            `📢 Announcement: "${ann.title}" has been posted in ${courseCode}.`,
            `/student/courses/${courseId}`
        );
    } catch (err) {
        console.error('[Notification Error] Failed to send announcement notification:', err.message);
    }

    return ApiResponse.success(res, 201, { announcement: populated }, 'Announcement posted.');
}));

// ── PATCH /api/v1/course-announcements/:id ────────────────────────────────────
router.patch('/:id', protect, authorize('faculty', 'admin'), asyncHandler(async (req, res) => {
    const ann = await CourseAnnouncement.findById(req.params.id);
    if (!ann) throw ApiError.notFound('Announcement not found.');
    if (req.user.role === 'faculty' && ann.postedBy.toString() !== req.user.id) {
        throw ApiError.forbidden('You can only edit your own announcements.');
    }
    const allowed = ['title', 'body', 'priority', 'isPinned', 'attachmentUrl'];
    allowed.forEach(k => { if (req.body[k] !== undefined) ann[k] = req.body[k]; });
    await ann.save();
    return ApiResponse.success(res, 200, { announcement: ann }, 'Announcement updated.');
}));

// ── DELETE /api/v1/course-announcements/:id ───────────────────────────────────
router.delete('/:id', protect, authorize('faculty', 'admin'), asyncHandler(async (req, res) => {
    const ann = await CourseAnnouncement.findById(req.params.id);
    if (!ann) throw ApiError.notFound('Announcement not found.');
    if (req.user.role === 'faculty' && ann.postedBy.toString() !== req.user.id) {
        throw ApiError.forbidden('You can only delete your own announcements.');
    }
    await ann.deleteOne();
    return ApiResponse.success(res, 200, null, 'Announcement deleted.');
}));

module.exports = router;
