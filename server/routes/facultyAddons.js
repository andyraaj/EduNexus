const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const LeaveRequest = require('../models/LeaveRequest');
const DoubtQuery = require('../models/DoubtQuery');
const Course = require('../models/Course');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');

// ==========================================
// LEAVE REQUESTS
// ==========================================

// @desc    Get logged in faculty's leave requests
// @route   GET /api/v1/faculty-addons/leaves
router.get('/leaves', protect, authorize('faculty'), asyncHandler(async (req, res) => {
    const leaves = await LeaveRequest.find({ faculty: req.user.id }).sort({ createdAt: -1 });
    return ApiResponse.success(res, 200, { leaves });
}));

// @desc    Submit new leave request
// @route   POST /api/v1/faculty-addons/leaves
router.post('/leaves', protect, authorize('faculty'), asyncHandler(async (req, res) => {
    const { leaveType, startDate, endDate, reason, alternativeClassArrangement } = req.body;
    if (!leaveType || !startDate || !endDate || !reason) {
        throw ApiError.badRequest('leaveType, startDate, endDate, and reason are required.');
    }

    const leave = await LeaveRequest.create({
        faculty: req.user.id, // User._id
        leaveType,
        startDate,
        endDate,
        reason,
        alternativeClassArrangement,
    });

    return ApiResponse.success(res, 201, { leave }, 'Leave request submitted.');
}));

// @desc    Get ALL leave requests (for admin review)
// @route   GET /api/v1/faculty-addons/leaves/admin
router.get('/leaves/admin', protect, authorize('admin'), asyncHandler(async (req, res) => {
    // LeaveRequest.faculty = User._id — populate User directly
    const leaves = await LeaveRequest.find({})
        .populate('faculty', 'name email')
        .sort({ createdAt: -1 });
    return ApiResponse.success(res, 200, { leaves });
}));

// @desc    Approve/Reject leave request (admin only)
// @route   PATCH /api/v1/faculty-addons/leaves/admin/:id
router.patch('/leaves/admin/:id', protect, authorize('admin'), asyncHandler(async (req, res) => {
    const { status, comments } = req.body;
    if (!status || !['approved', 'rejected'].includes(status)) {
        throw ApiError.badRequest('Status must be "approved" or "rejected".');
    }

    const leave = await LeaveRequest.findById(req.params.id);
    if (!leave) throw ApiError.notFound('Leave request not found.');

    leave.status = status;
    if (comments) leave.comments = comments;
    await leave.save();

    return ApiResponse.success(res, 200, { leave }, `Leave request ${status}.`);
}));


// ==========================================
// DOUBT / QUERY SYSTEM
// ==========================================

// @desc    Get doubts by course (for faculty/admin/student)
// @route   GET /api/v1/faculty-addons/doubts/course/:courseId
router.get('/doubts/course/:courseId', protect, authorize('faculty', 'admin', 'student'), asyncHandler(async (req, res) => {
    // DoubtQuery.student = User._id — populate User directly
    const doubts = await DoubtQuery.find({ course: req.params.courseId })
        .populate('student', 'name email')
        .populate('replies.user', 'name email role')
        .sort({ updatedAt: -1 });
    return ApiResponse.success(res, 200, { doubts });
}));

// @desc    Get doubts created by student
// @route   GET /api/v1/faculty-addons/doubts/student
router.get('/doubts/student', protect, authorize('student'), asyncHandler(async (req, res) => {
    const doubts = await DoubtQuery.find({ student: req.user.id })
        .populate('course', 'code title')
        .populate('replies.user', 'name email role')
        .sort({ updatedAt: -1 });
    return ApiResponse.success(res, 200, { doubts });
}));

// @desc    Create new doubt ticket (student)
// @route   POST /api/v1/faculty-addons/doubts
router.post('/doubts', protect, authorize('student'), asyncHandler(async (req, res) => {
    const { courseId, title, description } = req.body;
    if (!courseId || !title || !description) {
        throw ApiError.badRequest('courseId, title, and description are required.');
    }

    const doubt = await DoubtQuery.create({
        student: req.user.id, // User._id
        course: courseId,
        title,
        description,
    });

    // Notify the primary faculty member of this course in real-time
    const course = await Course.findById(courseId);
    if (course && course.primaryFaculty) {
        const notificationService = require('../services/notificationService');
        await notificationService.createDirectNotification(
            course.primaryFaculty,
            'doubt_created',
            `❓ Doubt raised by ${req.user.name}: "${title}" in ${course.code}.`,
            '/faculty/doubts'
        );
    }

    return ApiResponse.success(res, 201, { doubt }, 'Doubt submitted.');
}));

// @desc    Post reply to doubt
// @route   POST /api/v1/faculty-addons/doubts/:id/reply
router.post('/doubts/:id/reply', protect, asyncHandler(async (req, res) => {
    const { message } = req.body;
    if (!message) throw ApiError.badRequest('Reply message is required.');

    const doubt = await DoubtQuery.findById(req.params.id);
    if (!doubt) throw ApiError.notFound('Doubt query not found.');

    doubt.replies.push({ user: req.user.id, message });
    await doubt.save();

    const populated = await DoubtQuery.findById(doubt._id)
        .populate('student', 'name email')
        .populate('replies.user', 'name email role');

    // Notify student or advisor in real-time
    const isStudent = req.user.role === 'student';
    const notificationService = require('../services/notificationService');
    const senderName = req.user.name || 'User';

    if (isStudent) {
        // Find course to get faculty
        const course = await Course.findById(doubt.course);
        if (course && course.primaryFaculty) {
            await notificationService.createDirectNotification(
                course.primaryFaculty,
                'doubt_reply',
                `💬 New reply on doubt "${doubt.title}" by student ${senderName}.`,
                '/faculty/doubts'
            );
        }
    } else {
        // Faculty replied -> notify student
        await notificationService.createDirectNotification(
            doubt.student,
            'doubt_reply',
            `💬 New reply on doubt "${doubt.title}" by ${senderName}.`,
            '/student/doubts'
        );
    }

    return ApiResponse.success(res, 200, { doubt: populated }, 'Reply added.');
}));

// @desc    Resolve/Reopen doubt
// @route   PATCH /api/v1/faculty-addons/doubts/:id/status
router.patch('/doubts/:id/status', protect, asyncHandler(async (req, res) => {
    const { status } = req.body;
    if (!status || !['open', 'resolved'].includes(status)) {
        throw ApiError.badRequest('Status must be "open" or "resolved".');
    }

    const doubt = await DoubtQuery.findById(req.params.id);
    if (!doubt) throw ApiError.notFound('Doubt query not found.');

    doubt.status = status;
    await doubt.save();

    return ApiResponse.success(res, 200, { doubt }, `Doubt marked as ${status}.`);
}));


// ==========================================
// COURSE SYLLABUS PROGRESS TRACKING
// ==========================================

// @desc    Update course syllabus units and progress
// @route   PATCH /api/v1/faculty-addons/courses/:courseId/syllabus
router.patch('/courses/:courseId/syllabus', protect, authorize('faculty', 'admin'), asyncHandler(async (req, res) => {
    const { syllabusUnits } = req.body;
    if (!syllabusUnits || !Array.isArray(syllabusUnits)) {
        throw ApiError.badRequest('syllabusUnits array is required.');
    }

    const course = await Course.findById(req.params.courseId);
    if (!course) throw ApiError.notFound('Course not found.');

    // Verify faculty ownership if not admin
    if (req.user.role === 'faculty') {
        if (!course.primaryFaculty || course.primaryFaculty.toString() !== req.user.id.toString()) {
            throw ApiError.forbidden('You can only update your own courses.');
        }
    }

    const completedCount = syllabusUnits.filter(unit => unit.isCompleted).length;
    const progressPercentage = syllabusUnits.length > 0
        ? Math.round((completedCount / syllabusUnits.length) * 100)
        : 0;

    course.syllabusUnits = syllabusUnits;
    course.syllabusProgress = progressPercentage;
    await course.save();

    return ApiResponse.success(res, 200, { course }, 'Syllabus updated.');
}));


// ==========================================
// MENTORSHIP SYSTEM
// ==========================================

const MentorshipNote = require('../models/MentorshipNote');
const MentorshipMeeting = require('../models/MentorshipMeeting');
const Student = require('../models/Student');
const Faculty = require('../models/Faculty');
const User = require('../models/User');

// @desc    Get all mentees for advisor (Faculty/Admin)
// @route   GET /api/v1/faculty-addons/mentorship/mentees
router.get('/mentorship/mentees', protect, authorize('faculty', 'admin'), asyncHandler(async (req, res) => {
    const facultyProfile = await Faculty.findOne({ user: req.user.id });
    const deptQuery = facultyProfile ? { department: facultyProfile.department } : {};

    const studentProfiles = await Student.find(deptQuery)
        .populate('user', 'name email')
        .populate('department', 'name code')
        .sort({ rollNumber: 1 });

    const mentees = [];
    for (const st of studentProfiles) {
        if (!st.user) continue;
        const notes = await MentorshipNote.find({ mentor: req.user.id, student: st.user._id }).sort({ createdAt: -1 });
        const meetings = await MentorshipMeeting.find({ mentor: req.user.id, student: st.user._id }).sort({ scheduledAt: -1 });

        mentees.push({
            _id: st.user._id, // User._id
            rollNumber: st.rollNumber,
            department: st.department?.name || 'Computer Science',
            semester: st.semester,
            user: {
                name: st.user.name,
                email: st.user.email,
            },
            notes: notes.map(n => n.note),
            notesFull: notes,
            meetings,
        });
    }

    return ApiResponse.success(res, 200, { mentees });
}));

// @desc    Add advisory note for a mentee
// @route   POST /api/v1/faculty-addons/mentorship/notes
router.post('/mentorship/notes', protect, authorize('faculty', 'admin'), asyncHandler(async (req, res) => {
    const { studentId, note, gpa, attendanceRate, backlogsCount } = req.body;
    if (!studentId || !note) {
        throw ApiError.badRequest('studentId and note are required.');
    }

    const newNote = await MentorshipNote.create({
        mentor: req.user.id,
        student: studentId,
        note,
        gpa: gpa || 0,
        attendanceRate: attendanceRate || 0,
        backlogsCount: backlogsCount || 0,
    });

    // Notify student in real-time
    const notificationService = require('../services/notificationService');
    await notificationService.createDirectNotification(
        studentId,
        'mentorship_note',
        `📝 Your mentor has recorded a new advising log entry for you.`,
        '/student/mentorship'
    );

    return ApiResponse.success(res, 201, { note: newNote }, 'Advisory note recorded successfully.');
}));

// @desc    Get student's mentorship status (advisor, advising notes, meetings)
// @route   GET /api/v1/faculty-addons/mentorship/student
router.get('/mentorship/student', protect, authorize('student'), asyncHandler(async (req, res) => {
    const studentProfile = await Student.findOne({ user: req.user.id }).populate('department');
    if (!studentProfile) throw ApiError.notFound('Student profile not found.');

    // Find a faculty member in the same department to assign as mentor dynamically
    let mentorUser = null;
    const advisor = await Faculty.findOne({ department: studentProfile.department }).populate('user', 'name email');
    if (advisor && advisor.user) {
        mentorUser = advisor.user;
    } else {
        // Fall back to any faculty
        const anyFaculty = await Faculty.findOne().populate('user', 'name email');
        if (anyFaculty) mentorUser = anyFaculty.user;
    }

    if (!mentorUser) {
        return ApiResponse.success(res, 200, { mentor: null, notes: [], meetings: [] });
    }

    const notes = await MentorshipNote.find({ student: req.user.id }).populate('mentor', 'name email').sort({ createdAt: -1 });
    const meetings = await MentorshipMeeting.find({ student: req.user.id }).populate('mentor', 'name email').sort({ scheduledAt: -1 });

    return ApiResponse.success(res, 200, {
        mentor: {
            _id: mentorUser._id,
            name: mentorUser.name,
            email: mentorUser.email,
        },
        notes,
        meetings,
    });
}));

// @desc    Request/schedule mentorship meeting
// @route   POST /api/v1/faculty-addons/mentorship/meetings
router.post('/mentorship/meetings', protect, asyncHandler(async (req, res) => {
    const { title, description, scheduledAt, targetUserId } = req.body;
    if (!title || !scheduledAt || !targetUserId) {
        throw ApiError.badRequest('title, scheduledAt, and targetUserId are required.');
    }

    const isStudent = req.user.role === 'student';

    const meeting = await MentorshipMeeting.create({
        mentor: isStudent ? targetUserId : req.user.id,
        student: isStudent ? req.user.id : targetUserId,
        title,
        description,
        scheduledAt,
        requestedBy: isStudent ? 'student' : 'mentor',
        status: 'pending',
    });

    // Notify the target user in real-time
    const notificationService = require('../services/notificationService');
    const senderUser = await User.findById(req.user.id).select('name').lean();
    const senderName = senderUser?.name || (isStudent ? 'Your Student' : 'Your Mentor');
    await notificationService.createDirectNotification(
        targetUserId,
        'mentorship_meeting',
        `🗓️ New mentorship meeting request: "${title}" by ${senderName}.`,
        isStudent ? '/faculty/mentorship' : '/student/mentorship'
    );

    return ApiResponse.success(res, 201, { meeting }, 'Meeting requested successfully.');
}));

// @desc    Approve/Decline/Complete mentorship meeting
// @route   PATCH /api/v1/faculty-addons/mentorship/meetings/:id
router.patch('/mentorship/meetings/:id', protect, asyncHandler(async (req, res) => {
    const { status } = req.body;
    if (!status || !['approved', 'declined', 'completed'].includes(status)) {
        throw ApiError.badRequest('Valid status required: approved, declined, completed.');
    }

    const meeting = await MentorshipMeeting.findById(req.params.id);
    if (!meeting) throw ApiError.notFound('Meeting not found.');

    meeting.status = status;
    await meeting.save();

    // Notify the other participant in real-time
    const isStudent = req.user.role === 'student';
    const targetUserId = isStudent ? meeting.mentor : meeting.student;

    const notificationService = require('../services/notificationService');
    await notificationService.createDirectNotification(
        targetUserId,
        'mentorship_meeting',
        `🗓️ Mentorship meeting status updated to ${status}: "${meeting.title}".`,
        isStudent ? '/faculty/mentorship' : '/student/mentorship'
    );

    return ApiResponse.success(res, 200, { meeting }, 'Meeting status updated.');
}));

module.exports = router;
