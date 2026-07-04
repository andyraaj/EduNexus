const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const ApiError = require('../utils/ApiError');

// ── Reusable populate configs ─────────────────────────────────────────────────

// primaryFaculty now refs User directly — populate name/email from User
const FACULTY_POPULATE = {
    path: 'primaryFaculty',
    select: 'name email role',
};

// department now refs Department — populate name/code
const DEPARTMENT_POPULATE = {
    path: 'department',
    select: 'name code',
};

// ── Course CRUD ───────────────────────────────────────────────────────────────

/**
 * Paginated list of courses with optional search, department and semester filters.
 */
const getAllCourses = async ({ search, department, semester, isActive, page = 1, limit = 20 }) => {
    const query = {};
    if (department) query.department = department; // Now ObjectId, not regex on string
    if (semester) query.semester = Number(semester);
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (search) {
        query.$or = [
            { code: { $regex: search, $options: 'i' } },
            { title: { $regex: search, $options: 'i' } },
        ];
    }

    const skip = (page - 1) * limit;
    const [courses, total] = await Promise.all([
        Course.find(query)
            .populate(FACULTY_POPULATE)
            .populate(DEPARTMENT_POPULATE)
            .sort({ department: 1, semester: 1, code: 1 })
            .skip(skip)
            .limit(Number(limit)),
        Course.countDocuments(query),
    ]);

    return {
        courses,
        meta: { page: Number(page), limit: Number(limit), totalRecords: total, totalPages: Math.ceil(total / limit) },
    };
};

/**
 * Get a single course by ID with populated faculty and department.
 */
const getCourseById = async (id) => {
    const course = await Course.findById(id)
        .populate(FACULTY_POPULATE)
        .populate(DEPARTMENT_POPULATE);
    if (!course) throw ApiError.notFound('Course not found.');
    return course;
};

/**
 * Get all courses taught by a specific faculty member (by User._id).
 * primaryFaculty now stores User._id directly.
 */
const getCoursesByFaculty = async (userId) => {
    return Course.find({ primaryFaculty: userId, isActive: true })
        .populate(FACULTY_POPULATE)
        .populate(DEPARTMENT_POPULATE)
        .sort({ semester: 1, code: 1 });
};

/**
 * Create a new course. Code must be globally unique.
 */
const createCourse = async (data) => {
    const code = data.code?.toUpperCase();
    const existing = await Course.findOne({ code });
    if (existing) throw ApiError.conflict(`A course with code '${code}' already exists.`);
    const course = await Course.create({ ...data, code });
    return Course.findById(course._id)
        .populate(FACULTY_POPULATE)
        .populate(DEPARTMENT_POPULATE);
};

/**
 * Update course fields. Admin only.
 */
const updateCourse = async (id, updates) => {
    // Prevent changing the course code via update
    const safeUpdates = { ...updates };
    delete safeUpdates.code;

    const course = await Course.findByIdAndUpdate(id, safeUpdates, { new: true, runValidators: true })
        .populate(FACULTY_POPULATE)
        .populate(DEPARTMENT_POPULATE);
    if (!course) throw ApiError.notFound('Course not found.');
    return course;
};

/**
 * Soft-delete (deactivate) a course. Sets isActive: false.
 */
const deleteCourse = async (id) => {
    const course = await Course.findByIdAndUpdate(id, { isActive: false }, { new: true })
        .populate(FACULTY_POPULATE)
        .populate(DEPARTMENT_POPULATE);
    if (!course) throw ApiError.notFound('Course not found.');
    return course;
};

/**
 * Get the enrolled student roster for a specific course.
 * Enrollment.student is User._id — populate User directly + optionally join Student profile.
 */
const getCourseRoster = async (courseId) => {
    const enrollments = await Enrollment.find({ course: courseId, status: 'enrolled' })
        .populate({
            path: 'student',
            select: 'name email role',
        })
        .sort({ createdAt: -1 });
    return enrollments;
};

module.exports = {
    getAllCourses, getCourseById, getCoursesByFaculty,
    createCourse, updateCourse, deleteCourse, getCourseRoster,
};
