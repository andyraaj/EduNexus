const courseService = require('../services/courseService');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const { getIO } = require('../socketServer');

// Broadcast a course_updated event so all connected clients can re-fetch
const broadcastCourseUpdate = (courseId, payload) => {
    try {
        const io = getIO();
        io.to(`course_${courseId}`).emit('course_updated', payload);
        // Also broadcast globally so admin/others not in course room get it
        io.emit('courses_changed', { courseId, ...payload });
    } catch (e) {
        console.warn('[Socket] broadcastCourseUpdate failed:', e.message);
    }
};

// GET /api/v1/courses
const getAllCourses = asyncHandler(async (req, res) => {
    const { search, department, semester, isActive, page, limit } = req.query;
    const result = await courseService.getAllCourses({ search, department, semester, isActive, page, limit });
    return ApiResponse.success(res, 200, { courses: result.courses }, 'Courses fetched.', result.meta);
});

// GET /api/v1/courses/my-courses (Faculty: courses they teach)
// primaryFaculty now stores User._id directly — no Faculty lookup needed
const getMyCourses = asyncHandler(async (req, res) => {
    const courses = await courseService.getCoursesByFaculty(req.user.id);
    return ApiResponse.success(res, 200, { courses });
});

// GET /api/v1/courses/:id
const getCourseById = asyncHandler(async (req, res) => {
    const course = await courseService.getCourseById(req.params.id);
    return ApiResponse.success(res, 200, { course });
});

// POST /api/v1/courses
const createCourse = asyncHandler(async (req, res) => {
    const { code, title, description, credits, department, semester, primaryFaculty, maxEnrollment } = req.body;
    if (!code || !title || !department || !semester) {
        throw ApiError.badRequest('code, title, department, and semester are required.', 'MISSING_FIELDS');
    }
    const course = await courseService.createCourse({ code, title, description, credits, department, semester, primaryFaculty, maxEnrollment });
    // Notify everyone that the course catalog changed
    try { getIO().emit('courses_changed', { action: 'created', courseId: course._id }); } catch (_) {}
    return ApiResponse.success(res, 201, { course }, 'Course created successfully.');
});

// PUT /api/v1/courses/:id
const updateCourse = asyncHandler(async (req, res) => {
    const course = await courseService.updateCourse(req.params.id, req.body);
    broadcastCourseUpdate(course._id.toString(), {
        action: 'updated',
        course: { _id: course._id, title: course.title, isActive: course.isActive, primaryFaculty: course.primaryFaculty }
    });
    return ApiResponse.success(res, 200, { course }, 'Course updated.');
});

// DELETE /api/v1/courses/:id (soft-delete = deactivate)
const deleteCourse = asyncHandler(async (req, res) => {
    const course = await courseService.deleteCourse(req.params.id);
    broadcastCourseUpdate(course._id.toString(), { action: 'deactivated', courseId: course._id });
    return ApiResponse.success(res, 200, { course }, 'Course deactivated.');
});

// GET /api/v1/courses/:id/roster
const getCourseRoster = asyncHandler(async (req, res) => {
    const roster = await courseService.getCourseRoster(req.params.id);
    return ApiResponse.success(res, 200, { roster, count: roster.length });
});

// PATCH /api/v1/courses/:id/reactivate — Admin can re-activate a deactivated course
const reactivateCourse = asyncHandler(async (req, res) => {
    const course = await courseService.updateCourse(req.params.id, { isActive: true });
    broadcastCourseUpdate(course._id.toString(), { action: 'reactivated', courseId: course._id });
    return ApiResponse.success(res, 200, { course }, 'Course reactivated.');
});

module.exports = { getAllCourses, getMyCourses, getCourseById, createCourse, updateCourse, deleteCourse, getCourseRoster, reactivateCourse };
