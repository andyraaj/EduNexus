const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');
const User = require('../models/User');
const Student = require('../models/Student');
const ApiError = require('../utils/ApiError');

const currentAcademicYear = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    return month >= 7 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
};

// Populate configs for consistent course/department/faculty data
const COURSE_POPULATE = [
    {
        path: 'course',
        select: 'code title credits department semester description primaryFaculty isActive',
        populate: [
            { path: 'department', select: 'name code' },
            { path: 'primaryFaculty', select: 'name email' },
        ],
    },
];

// ── Enrollment Service ─────────────────────────────────────────────────────────

/**
 * Enroll a student in a course for the current academic year.
 * Enrollment.student = User._id (direct).
 */
const enrollStudent = async (userId, courseId) => {
    const studentUser = await User.findById(userId);
    if (!studentUser || studentUser.role !== 'student') {
        throw ApiError.notFound('Student profile not found.');
    }

    const course = await Course.findById(courseId);
    if (!course) throw ApiError.notFound('Course not found.');
    if (!course.isActive) throw ApiError.badRequest('This course is no longer accepting enrollments.');

    const year = currentAcademicYear();

    // Duplicate enrollment check
    const existing = await Enrollment.findOne({ student: userId, course: courseId, academicYear: year });
    if (existing) {
        if (existing.status === 'enrolled') {
            throw ApiError.conflict('You are already enrolled in this course.');
        }
        if (existing.status === 'dropped') {
            // Re-enroll
            existing.status = 'enrolled';
            await existing.save();
            return Enrollment.findById(existing._id).populate(COURSE_POPULATE);
        }
    }

    // Enrollment cap check
    const currentCount = await Enrollment.countDocuments({ course: courseId, academicYear: year, status: 'enrolled' });
    if (currentCount >= course.maxEnrollment) {
        throw ApiError.badRequest(`This course has reached its enrollment limit of ${course.maxEnrollment} students.`);
    }

    const enrollment = await Enrollment.create({
        student: userId, // User._id directly
        course: courseId,
        academicYear: year,
        semester: course.semester,
    });

    return Enrollment.findById(enrollment._id)
        .populate(COURSE_POPULATE)
        .populate('student', 'name email');
};

/**
 * Drop a student's enrollment from a course.
 */
const dropCourse = async (userId, enrollmentId) => {
    const enrollment = await Enrollment.findOne({ _id: enrollmentId, student: userId });
    if (!enrollment) throw ApiError.notFound('Enrollment record not found.');
    if (enrollment.status === 'dropped') throw ApiError.badRequest('This course is already dropped.');

    enrollment.status = 'dropped';
    await enrollment.save();
    return enrollment;
};

/**
 * Get all active enrollments for the currently logged-in student.
 */
const getMyCourses = async (userId) => {
    // MyCamu Auto-Enrollment: Automatically enroll student in active courses matching their department and semester
    try {
        const studentProfile = await Student.findOne({ user: userId });
        if (studentProfile) {
            const activeCourses = await Course.find({
                department: studentProfile.department,
                semester: studentProfile.semester,
                isActive: true
            });
            const year = currentAcademicYear();
            for (const course of activeCourses) {
                const existing = await Enrollment.findOne({
                    student: userId,
                    course: course._id,
                    academicYear: year
                });
                if (!existing) {
                    await Enrollment.create({
                        student: userId,
                        course: course._id,
                        academicYear: year,
                        semester: course.semester,
                        status: 'enrolled'
                    });
                } else if (existing.status === 'dropped') {
                    // Automatically restore to enrolled if managed centrally
                    existing.status = 'enrolled';
                    await existing.save();
                }
            }
        }
    } catch (err) {
        console.error('[AutoEnrollment Error]:', err.message);
    }

    return Enrollment.find({ student: userId, status: 'enrolled' })
        .populate(COURSE_POPULATE)
        .sort({ createdAt: -1 });
};

/**
 * Get courses taught by a faculty member, with enrolled student counts.
 */
const getMyTaughtCourses = async (userId) => {
    const courses = await Course.find({ primaryFaculty: userId, isActive: true })
        .populate({ path: 'department', select: 'name code' })
        .sort({ semester: 1, code: 1 });

    const year = currentAcademicYear();
    const annotated = await Promise.all(
        courses.map(async (c) => {
            const count = await Enrollment.countDocuments({
                course: c._id,
                status: 'enrolled',
                academicYear: year,
            });
            return { ...c.toObject(), enrolledCount: count };
        })
    );
    return annotated;
};

module.exports = { enrollStudent, dropCourse, getMyCourses, getMyTaughtCourses, currentAcademicYear };
