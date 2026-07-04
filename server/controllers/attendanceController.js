const attendanceService = require('../services/attendanceService');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');

// POST /api/v1/attendance/mark
const markAttendance = asyncHandler(async (req, res) => {
    const { courseId, date, records } = req.body;
    if (!courseId || !date || !records || !Array.isArray(records)) {
        throw ApiError.badRequest('courseId, date, and an array of records are required.', 'MISSING_FIELDS');
    }
    // req.user.id is User._id — matches AttendanceRecord.faculty ref (now User)
    const attendance = await attendanceService.markAttendance(req.user.id, courseId, date, records);
    return ApiResponse.success(res, 201, { attendance }, 'Attendance marked successfully.');
});

// GET /api/v1/attendance/my-records (Student)
const getMyRecords = asyncHandler(async (req, res) => {
    const data = await attendanceService.getStudentAttendance(req.user.id);
    return ApiResponse.success(res, 200, data, 'Student attendance fetched.');
});

// GET /api/v1/attendance/course/:courseId (Faculty/Admin)
const getCourseAttendance = asyncHandler(async (req, res) => {
    const data = await attendanceService.getCourseAttendance(req.params.courseId);
    return ApiResponse.success(res, 200, data, 'Course attendance fetched.');
});

module.exports = {
    markAttendance,
    getMyRecords,
    getCourseAttendance,
};
