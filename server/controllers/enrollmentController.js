const enrollmentService = require('../services/enrollmentService');

const ok = (res, code, data, msg = 'Success') =>
    res.status(code).json({ success: true, message: msg, data, error: null });
const err = (res, e) =>
    res.status(e.status || 500).json({ success: false, data: null, error: { code: e.code || 'SERVER_ERROR', message: e.message } });

// POST /api/v1/enrollments  — Student enrolls in a course
const enrollInCourse = async (req, res) => {
    try {
        const { courseId } = req.body;
        if (!courseId) return res.status(400).json({ success: false, data: null, error: { code: 'MISSING_FIELDS', message: 'courseId is required.' } });
        const enrollment = await enrollmentService.enrollStudent(req.user.id, courseId);
        return ok(res, 201, { enrollment }, 'Enrolled successfully.');
    } catch (e) { console.error(e); return err(res, e); }
};

// DELETE /api/v1/enrollments/:id  — Student drops a course
const dropCourse = async (req, res) => {
    try {
        const enrollment = await enrollmentService.dropCourse(req.user.id, req.params.id);
        return ok(res, 200, { enrollment }, 'Course dropped.');
    } catch (e) { console.error(e); return err(res, e); }
};

// GET /api/v1/enrollments/my-courses  — Student: all enrolled courses
const getMyCourses = async (req, res) => {
    try {
        const enrollments = await enrollmentService.getMyCourses(req.user.id);
        return ok(res, 200, { enrollments, count: enrollments.length });
    } catch (e) { console.error(e); return err(res, e); }
};

// GET /api/v1/enrollments/teaching  — Faculty: courses they teach with counts
const getTeachingCourses = async (req, res) => {
    try {
        const courses = await enrollmentService.getMyTaughtCourses(req.user.id);
        return ok(res, 200, { courses });
    } catch (e) { console.error(e); return err(res, e); }
};

module.exports = { enrollInCourse, dropCourse, getMyCourses, getTeachingCourses };
