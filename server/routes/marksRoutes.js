const express = require('express');
const router = express.Router();
const Marks = require('../models/Marks');
const PDFDocument = require('pdfkit');
const User = require('../models/User');
const Student = require('../models/Student');
const { protect, authorize } = require('../middleware/authMiddleware');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');

// @desc    Enter/Update Marks
// @route   POST /api/marks
// Marks.student = User._id, Marks.course = Course._id
router.post('/', protect, authorize('faculty', 'admin'), asyncHandler(async (req, res) => {
    const { studentId, courseId, examType, score, maxScore } = req.body;

    if (!studentId || !courseId || !examType || score === undefined || !maxScore) {
        throw ApiError.badRequest('studentId, courseId, examType, score, and maxScore are required.');
    }

    // Marks.student = User._id — use studentId directly
    let marks = await Marks.findOne({ student: studentId, course: courseId, examType });

    if (marks) {
        marks.score = score;
        marks.maxScore = maxScore;
        await marks.save();
    } else {
        marks = await Marks.create({
            student: studentId,  // User._id
            course: courseId,    // Course._id (not Subject)
            examType,
            score,
            maxScore
        });
    }

    return ApiResponse.success(res, 200, { marks }, 'Marks saved.');
}));

// @desc    Get Marks for logged in student
// @route   GET /api/marks/my
// Marks.student = User._id — query directly
router.get('/my', protect, authorize('student'), asyncHandler(async (req, res) => {
    const marks = await Marks.find({ student: req.user.id })
        .populate('course', 'code title credits')
        .populate({ path: 'course', populate: { path: 'department', select: 'name code' } });

    return ApiResponse.success(res, 200, { marks }, 'Marks fetched.');
}));

// @desc    Download Marksheet PDF
// @route   GET /api/marks/download/:semester
router.get('/download/:semester', protect, authorize('student'), asyncHandler(async (req, res) => {
    const semester = parseInt(req.params.semester);
    const user = await User.findById(req.user.id).select('name email');
    const studentProfile = await Student.findOne({ user: req.user.id });

    if (!user || !studentProfile) {
        throw ApiError.notFound('Student profile not found.');
    }

    const marks = await Marks.find({ student: req.user.id })
        .populate('course', 'code title credits');

    // Create PDF
    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=marksheet_sem${semester}.pdf`);
    doc.pipe(res);

    // PDF Content
    doc.fontSize(20).text('EduNexus University', { align: 'center' });
    doc.moveDown();
    doc.fontSize(16).text('Official Marksheet', { align: 'center' });
    doc.moveDown();

    doc.fontSize(12).text(`Name: ${user.name}`);
    doc.text(`Roll Number: ${studentProfile.rollNumber}`);
    doc.text(`Semester: ${semester}`);
    doc.moveDown();

    doc.text('------------------------------------------------------------');
    doc.moveDown();

    // Table Header
    doc.text('Course                                   Score    Max Score');
    doc.moveDown(0.5);

    // Table Rows
    let totalScore = 0;
    let totalMax = 0;

    marks.forEach(mark => {
        const courseName = (mark.course?.title || 'Unknown').padEnd(40, ' ');
        const score = mark.score.toString().padEnd(8, ' ');
        const max = mark.maxScore.toString();

        doc.text(`${courseName} ${score} ${max}`);
        totalScore += mark.score;
        totalMax += mark.maxScore;
    });

    doc.moveDown();
    doc.text('------------------------------------------------------------');
    doc.moveDown();

    const percentage = totalMax > 0 ? ((totalScore / totalMax) * 100).toFixed(2) : 0;
    doc.fontSize(14).text(`Total: ${totalScore} / ${totalMax}   (${percentage}%)`, { align: 'right' });

    if (percentage >= 40) {
        doc.fillColor('green').text('RESULT: PASS', { align: 'right' });
    } else {
        doc.fillColor('red').text('RESULT: FAIL', { align: 'right' });
    }

    doc.end();
}));

module.exports = router;
