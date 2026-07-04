const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Faculty = require('../models/Faculty');
const Student = require('../models/Student');
const Course = require('../models/Course');
const { protect, authorize } = require('../middleware/authMiddleware');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');

// @desc    Get ALL faculty members (for admin dropdowns — assigns faculty to courses)
// @route   GET /api/v1/faculty
// CRITICAL: Returns User._id (not Faculty._id) since Course.primaryFaculty = User._id
router.get('/', protect, authorize('admin', 'faculty'), asyncHandler(async (req, res) => {
    const faculties = await Faculty.find({})
        .populate('user', 'name email')
        .populate('department', 'name code')
        .sort({ createdAt: -1 });

    // Shape for CourseFormModal: _id must be User._id since Course.primaryFaculty refs User
    const shaped = faculties.map(f => ({
        _id: f.user?._id || f.user, // User._id — this is what Course.primaryFaculty stores
        name: f.user?.name || 'Unknown',
        email: f.user?.email || '',
        department: f.department, // Populated Department object
        designation: f.designation,
        employeeId: f.employeeId,
    }));

    return ApiResponse.success(res, 200, { faculties: shaped });
}));

// @desc    Get all students (for faculty use - attendance marking, grading)
// @route   GET /api/v1/faculty/students
router.get('/students', protect, authorize('faculty', 'admin'), asyncHandler(async (req, res) => {
    const students = await Student.find()
        .populate('user', 'name email')
        .populate('department', 'name code')
        .sort({ rollNumber: 1 });

    // Shape: _id = User._id for consistency with Enrollment.student
    const shaped = students.map(s => ({
        _id: s.user?._id || s.user, // User._id
        name: s.user?.name || 'Unknown',
        email: s.user?.email || '',
        rollNumber: s.rollNumber,
        department: s.department,
        semester: s.semester,
    }));

    return ApiResponse.success(res, 200, { students: shaped });
}));

// @desc    Get courses (replaces legacy subjects endpoint)
// @route   GET /api/v1/faculty/courses
router.get('/courses', protect, authorize('faculty', 'admin'), asyncHandler(async (req, res) => {
    const courses = await Course.find({ isActive: true })
        .populate('department', 'name code')
        .sort({ code: 1 });
    return ApiResponse.success(res, 200, { courses });
}));

// Legacy alias for backward compatibility
router.get('/subjects', protect, authorize('faculty', 'admin'), asyncHandler(async (req, res) => {
    const courses = await Course.find({ isActive: true })
        .populate('department', 'name code')
        .sort({ code: 1 });
    return ApiResponse.success(res, 200, { subjects: courses });
}));

module.exports = router;
