const mongoose = require('mongoose');
const AttendanceRecord = require('../models/AttendanceRecord');
const Assignment = require('../models/Assignment');
const Submission = require('../models/Submission');
const QuizAttempt = require('../models/QuizAttempt');
const Quiz = require('../models/Quiz');
const Student = require('../models/Student');
const Faculty = require('../models/Faculty');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const ApiError = require('../utils/ApiError');

/**
 * Student analytics.
 * All refs (Enrollment.student, Submission.student, QuizAttempt.student,
 * AttendanceRecord.records.student) are now User._id.
 */
const getStudentAnalytics = async (userId) => {
    const uid = new mongoose.Types.ObjectId(userId);

    // 1. Attendance Average — records.student is now User._id
    const attendanceStats = await AttendanceRecord.aggregate([
        { $unwind: "$records" },
        { $match: { "records.student": uid } },
        {
            $group: {
                _id: null,
                totalClasses: { $sum: 1 },
                present: { $sum: { $cond: [{ $in: ["$records.status", ["present", "late", "excused"]] }, 1, 0] } }
            }
        }
    ]);
    const attendancePercentage = attendanceStats.length > 0 && attendanceStats[0].totalClasses > 0
        ? (attendanceStats[0].present / attendanceStats[0].totalClasses) * 100
        : 0;

    // 2. Assignment Average — Submission.student is now User._id
    const submissions = await Submission.find({ student: userId }).populate('assignment', 'maxMarks');
    let totalMarksEarned = 0;
    let totalMaxMarks = 0;
    submissions.forEach(sub => {
        if (sub.marksAwarded !== undefined && sub.assignment) {
            totalMarksEarned += sub.marksAwarded;
            totalMaxMarks += sub.assignment.maxMarks;
        }
    });
    const assignmentAverage = totalMaxMarks > 0 ? (totalMarksEarned / totalMaxMarks) * 100 : 0;

    // 3. Quiz Average — QuizAttempt.student is now User._id
    const quizAttempts = await QuizAttempt.aggregate([
        { $match: { student: uid } },
        {
            $lookup: {
                from: 'quizzes',
                localField: 'quiz',
                foreignField: '_id',
                as: 'quizDetails'
            }
        },
        { $unwind: "$quizDetails" }
    ]);

    let quizEarned = 0;
    let quizMax = 0;
    quizAttempts.forEach(attempt => {
        const totalQuizMarks = attempt.quizDetails.questions.reduce((sum, q) => sum + (q.marks || 1), 0);
        quizEarned += attempt.score;
        quizMax += totalQuizMarks;
    });
    const quizAverage = quizMax > 0 ? (quizEarned / quizMax) * 100 : 0;

    // 4. Overall Score (weighted)
    const overallScore = (attendancePercentage * 0.2) + (assignmentAverage * 0.4) + (quizAverage * 0.4);

    // 5. Enrolled Courses — Enrollment.student is now User._id
    const enrollments = await Enrollment.find({ student: userId, status: 'enrolled' })
        .populate({ path: 'course', select: 'code title', populate: { path: 'department', select: 'name code' } });

    const enrolledCourses = enrollments.map((e, index) => {
        const colors = ['var(--primary)', '#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6'];
        const icons = ['💻', '📐', '⚛️', '📚', '🧪'];
        return {
            code: e.course?.code,
            name: e.course?.title,
            progress: Math.round(overallScore),
            color: colors[index % colors.length],
            icon: icons[index % icons.length]
        };
    });

    // 6. Upcoming Tasks
    const enrolledCourseIds = enrollments.map(e => e.course?._id).filter(Boolean);
    const now = new Date();

    const upcomingAssignments = await Assignment.find({
        course: { $in: enrolledCourseIds },
        dueDate: { $gte: now }
    }).populate('course', 'code').limit(5).sort({ dueDate: 1 });

    const upcomingQuizzes = await Quiz.find({
        course: { $in: enrolledCourseIds },
        isActive: true
    }).populate('course', 'code').limit(5).sort({ createdAt: -1 });

    const upcomingTasks = [
        ...upcomingAssignments.map(a => ({
            id: a._id.toString(),
            type: 'assignment',
            title: a.title,
            course: a.course?.code,
            due: new Date(a.dueDate).toLocaleDateString(),
            priority: 'high',
            icon: '📝'
        })),
        ...upcomingQuizzes.map(q => ({
            id: q._id.toString(),
            type: 'quiz',
            title: q.title,
            course: q.course?.code,
            due: 'Active Now',
            priority: 'medium',
            icon: '🧪'
        }))
    ].slice(0, 5);

    return {
        attendancePercentage: Math.round(attendancePercentage),
        assignmentAverage: Math.round(assignmentAverage),
        quizAverage: Math.round(quizAverage),
        overallScore: Math.round(overallScore),
        enrolledCourses,
        upcomingTasks
    };
};

/**
 * Faculty analytics for a specific course.
 * Course.primaryFaculty = User._id — compare directly.
 */
const getFacultyAnalytics = async (userId, courseId) => {
    const course = await Course.findById(courseId);
    if (!course) throw ApiError.notFound('Course not found.');
    // primaryFaculty = User._id — compare directly
    if (!course.primaryFaculty || course.primaryFaculty.toString() !== userId.toString()) {
        throw ApiError.forbidden('Not authorized to view analytics for this course.');
    }

    const cId = new mongoose.Types.ObjectId(courseId);

    // 1. Class Attendance Trends (last 10 sessions)
    const attendanceTrends = await AttendanceRecord.aggregate([
        { $match: { course: cId } },
        { $sort: { date: 1 } },
        { $limit: 10 },
        {
            $project: {
                date: 1,
                presentCount: {
                    $size: {
                        $filter: {
                            input: "$records",
                            as: "record",
                            cond: { $in: ["$$record.status", ["present", "late", "excused"]] }
                        }
                    }
                },
                totalStudents: { $size: "$records" }
            }
        }
    ]);

    // 2. Assignment Completion Rates
    const assignments = await Assignment.find({ course: cId });
    const assignmentStats = await Promise.all(assignments.map(async (assign) => {
        const subCount = await Submission.countDocuments({ assignment: assign._id });
        const enrollCount = await Enrollment.countDocuments({ course: cId, status: 'enrolled' });
        return {
            title: assign.title,
            completionRate: enrollCount > 0 ? (subCount / enrollCount) * 100 : 0
        };
    }));

    // 3. Quiz Score Distribution
    const quizzes = await Quiz.find({ course: cId });
    const quizDistributions = await Promise.all(quizzes.map(async (quiz) => {
        const attempts = await QuizAttempt.find({ quiz: quiz._id });
        const maxScore = quiz.questions.reduce((sum, q) => sum + (q.marks || 1), 0);

        let avgScore = 0;
        if (attempts.length > 0) {
            avgScore = attempts.reduce((sum, a) => sum + a.score, 0) / attempts.length;
        }

        return {
            title: quiz.title,
            averageScorePercentage: maxScore > 0 ? (avgScore / maxScore) * 100 : 0,
            attemptCount: attempts.length
        };
    }));

    return {
        attendanceTrends,
        assignmentStats,
        quizDistributions
    };
};

/**
 * Admin analytics (global).
 * Department is now ObjectId — populate for display names.
 */
const getAdminAnalytics = async () => {
    const [totalStudents, totalFaculty, totalCourses] = await Promise.all([
        Student.countDocuments(),
        Faculty.countDocuments(),
        Course.countDocuments({ isActive: true }),
    ]);

    // Revenue
    const revenueData = await Payment.aggregate([
        { $group: { _id: null, totalRevenue: { $sum: "$amount" } } }
    ]);
    const totalRevenue = revenueData.length > 0 ? revenueData[0].totalRevenue : 0;

    const invoiceData = await Invoice.aggregate([
        { $match: { status: { $ne: 'paid_full' } } },
        { $group: { _id: null, totalPending: { $sum: { $subtract: ["$amountDue", "$amountPaid"] } } } }
    ]);
    const pendingDues = invoiceData.length > 0 ? invoiceData[0].totalPending : 0;

    // Department Performance — department is now ObjectId, need $lookup
    const deptPerformance = await Course.aggregate([
        { $match: { isActive: true } },
        {
            $lookup: {
                from: "enrollments",
                localField: "_id",
                foreignField: "course",
                as: "enrollments"
            }
        },
        {
            $lookup: {
                from: "departments",
                localField: "department",
                foreignField: "_id",
                as: "deptInfo"
            }
        },
        { $unwind: { path: "$deptInfo", preserveNullAndEmptyArrays: true } },
        {
            $group: {
                _id: "$department",
                departmentName: { $first: "$deptInfo.name" },
                departmentCode: { $first: "$deptInfo.code" },
                totalEnrollments: { $sum: { $size: "$enrollments" } }
            }
        },
        { $sort: { totalEnrollments: -1 } }
    ]);

    // Monthly Revenue Trend (past 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const revenueTrend = await Payment.aggregate([
        { $match: { paymentDate: { $gte: sixMonthsAgo } } },
        {
            $group: {
                _id: { month: { $month: "$paymentDate" }, year: { $year: "$paymentDate" } },
                revenue: { $sum: "$amount" }
            }
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const formattedTrend = revenueTrend.map(r => ({
        label: monthNames[r._id.month - 1],
        revenue: r.revenue
    }));

    return {
        totalStudents,
        totalFaculty,
        totalCourses,
        totalRevenue,
        pendingDues,
        deptPerformance: deptPerformance.map(d => ({
            department: d.departmentName || 'Unassigned',
            departmentCode: d.departmentCode || '',
            enrollments: d.totalEnrollments
        })),
        revenueTrend: formattedTrend
    };
};

module.exports = {
    getStudentAnalytics,
    getFacultyAnalytics,
    getAdminAnalytics
};
