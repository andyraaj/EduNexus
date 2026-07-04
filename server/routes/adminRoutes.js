const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Invoice = require('../models/Invoice');
const Student = require('../models/Student');
const Faculty = require('../models/Faculty');
const Course = require('../models/Course');
const { protect, authorize } = require('../middleware/authMiddleware');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');

// @desc    Get admin dashboard stats (legacy endpoint — analytics/admin is preferred)
// @route   GET /api/admin/stats
router.get('/stats', protect, authorize('admin'), asyncHandler(async (req, res) => {
    const [totalStudents, totalFaculty, totalAdmins, totalCourses] = await Promise.all([
        User.countDocuments({ role: 'student' }),
        User.countDocuments({ role: 'faculty' }),
        User.countDocuments({ role: 'admin' }),
        Course.countDocuments({ isActive: true }),
    ]);

    const invoiceAgg = await Invoice.aggregate([
        {
            $group: {
                _id: null,
                totalRevenue: { $sum: '$amountPaid' },
                pendingDues: { $sum: { $subtract: ['$amountDue', '$amountPaid'] } },
                pendingCount: { $sum: { $cond: [{ $ne: ['$status', 'paid_full'] }, 1, 0] } },
            }
        }
    ]);

    const stats = invoiceAgg[0] || { totalRevenue: 0, pendingDues: 0, pendingCount: 0 };

    return ApiResponse.success(res, 200, {
        totalStudents,
        totalFaculty,
        totalAdmins,
        totalCourses,
        totalRevenue: stats.totalRevenue,
        pendingDues: stats.pendingDues,
        pendingInvoices: stats.pendingCount,
    });
}));

module.exports = router;
