const AttendanceRecord = require('../models/AttendanceRecord');
const Course = require('../models/Course');
const ApiError = require('../utils/ApiError');

// ── Service ───────────────────────────────────────────────────────────────────

/**
 * Mark attendance for a specific course and date.
 * Creates or updates the attendance record.
 * All refs (faculty, records.student) are now User._id.
 */
const markAttendance = async (userId, courseId, dateParam, records) => {
    // 1. Validate course and faculty authorization
    const course = await Course.findById(courseId);
    if (!course) throw ApiError.notFound('Course not found.');

    // primaryFaculty stores User._id — compare directly
    if (!course.primaryFaculty || course.primaryFaculty.toString() !== userId.toString()) {
        throw ApiError.badRequest('You are not authorized to mark attendance for this course.');
    }

    // 2. Parse date (strip time for accurate day-level indexing)
    const date = new Date(dateParam);
    date.setUTCHours(0, 0, 0, 0);

    // 3. Upsert record: if exists for course+date, update; otherwise create
    let doc = await AttendanceRecord.findOne({ course: courseId, date });

    // Normalize the records to match schema: map 'studentId' or 'student' directly to 'student'
    const formattedRecords = records.map(r => ({
        student: r.studentId || r.student,
        status: r.status,
        remarks: r.remarks || '',
    }));

    if (doc) {
        // Update existing record — full replacement of the array
        doc.records = formattedRecords;
        doc.faculty = userId; // User._id of the faculty
        await doc.save();
    } else {
        // Create new
        doc = await AttendanceRecord.create({
            course: courseId,
            faculty: userId, // User._id directly
            date,
            records: formattedRecords,
        });
    }

    return doc.populate([
        { path: 'course', select: 'code title' },
        { path: 'records.student', select: 'name email' } // User fields directly
    ]);
};

/**
 * Get the logged-in student's full attendance history across all courses.
 * records.student is now User._id, so we query by userId directly.
 */
const getStudentAttendance = async (userId) => {
    const records = await AttendanceRecord.find({ 'records.student': userId })
        .populate('course', 'code title credits')
        .populate({ path: 'course', populate: { path: 'department', select: 'name code' } })
        .sort({ date: -1 });

    // Format response and group by course
    const history = [];
    const courseStats = {};

    records.forEach(session => {
        const myRecord = session.records.find(r => r.student.toString() === userId.toString());
        if (!myRecord) return;

        const courseId = session.course._id.toString();
        if (!courseStats[courseId]) {
            courseStats[courseId] = {
                course: session.course,
                total: 0,
                present: 0,
                absent: 0,
                late: 0,
                excused: 0,
            };
        }

        courseStats[courseId].total += 1;
        courseStats[courseId][myRecord.status] += 1;

        history.push({
            date: session.date,
            course: session.course,
            status: myRecord.status,
            remarks: myRecord.remarks,
        });
    });

    const summary = Object.values(courseStats).map(stat => ({
        ...stat,
        percentage: stat.total > 0 ? Math.round(((stat.present + stat.late) / stat.total) * 100) : 0,
    }));

    return { summary, history };
};

/**
 * Get the full history for a specific course (Admin/Faculty).
 * faculty and records.student are now User._id — populate User directly.
 */
const getCourseAttendance = async (courseId) => {
    const records = await AttendanceRecord.find({ course: courseId })
        .populate('faculty', 'name email') // User fields directly
        .populate({
            path: 'records.student',
            select: 'name email'  // User fields directly
        })
        .sort({ date: -1 });

    // Aggregate statistics per student
    const studentStats = {};
    let totalClasses = records.length;

    records.forEach(session => {
        session.records.forEach(r => {
            const sid = r.student?._id?.toString() || r.student?.toString();
            if (!sid) return;
            if (!studentStats[sid]) {
                studentStats[sid] = {
                    student: r.student,
                    totalClasses: 0,
                    present: 0,
                    absent: 0,
                    late: 0,
                    excused: 0,
                };
            }
            studentStats[sid].totalClasses += 1;
            studentStats[sid][r.status] += 1;
        });
    });

    const aggregateRoster = Object.values(studentStats).map(stat => ({
        ...stat,
        percentage: stat.totalClasses > 0 ? Math.round(((stat.present + stat.late) / stat.totalClasses) * 100) : 0,
    }));

    return { sessions: records, aggregateRoster, totalClasses };
};

module.exports = {
    markAttendance,
    getStudentAttendance,
    getCourseAttendance,
};
