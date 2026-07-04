const Timetable = require('../models/Timetable');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');

// ── Helpers ───────────────────────────────────────────────────────────────────

const toMinutes = (time) => {
    const [hours, minutes] = String(time || '').split(':').map(Number);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return NaN;
    return hours * 60 + minutes;
};

const overlaps = (aStart, aEnd, bStart, bEnd) => {
    const startA = toMinutes(aStart);
    const endA = toMinutes(aEnd);
    const startB = toMinutes(bStart);
    const endB = toMinutes(bEnd);
    return startA < endB && startB < endA;
};

const validateTimes = (startTime, endTime) => {
    const start = toMinutes(startTime);
    const end = toMinutes(endTime);
    return !Number.isNaN(start) && !Number.isNaN(end) && end > start;
};

const findConflicts = async ({ faculty, dayOfWeek, startTime, endTime, classroom, semester, academicYear, excludeId }) => {
    const query = { dayOfWeek, academicYear, isActive: true };
    if (excludeId) query._id = { $ne: excludeId };

    const possible = await Timetable.find({
        ...query,
        $or: [{ faculty }, { classroom }, { semester }],
    }).populate('course', 'code title');

    return possible.filter((item) => overlaps(startTime, endTime, item.startTime, item.endTime)).map((item) => {
        let type = 'semester';
        if (String(item.faculty) === String(faculty)) type = 'faculty';
        if (item.classroom === classroom) type = 'classroom';
        return {
            type,
            timetableId: item._id,
            course: item.course,
            dayOfWeek: item.dayOfWeek,
            startTime: item.startTime,
            endTime: item.endTime,
            classroom: item.classroom,
        };
    });
};

// Timetable.faculty = User._id — populate User directly, and nested-populate department on Course
const TIMETABLE_POPULATE = [
    { path: 'course', select: 'title code semester', populate: { path: 'department', select: 'name code' } },
    { path: 'faculty', select: 'name email role' }, // User fields directly
];

// ── CRUD ──────────────────────────────────────────────────────────────────────

exports.createTimetable = asyncHandler(async (req, res) => {
    const { course, faculty, dayOfWeek, startTime, endTime, classroom, semester, academicYear } = req.body;

    if (!course || !faculty || !dayOfWeek || !startTime || !endTime || !classroom || !semester || !academicYear) {
        throw ApiError.badRequest('course, faculty, dayOfWeek, startTime, endTime, classroom, semester, and academicYear are required.');
    }

    if (!validateTimes(startTime, endTime)) {
        throw ApiError.badRequest('endTime must be after startTime.');
    }

    const courseExists = await Course.findById(course);
    if (!courseExists) throw ApiError.notFound('Course not found.');

    const conflicts = await findConflicts({ faculty, dayOfWeek, startTime, endTime, classroom, semester, academicYear });
    if (conflicts.length > 0) {
        return ApiResponse.error(res, 409, 'TIMETABLE_CONFLICT', 'Timetable entry conflicts with an existing class.', { conflicts });
    }

    const timetable = await Timetable.create({ course, faculty, dayOfWeek, startTime, endTime, classroom, semester, academicYear });
    const populated = await timetable.populate(TIMETABLE_POPULATE);

    return ApiResponse.success(res, 201, { timetable: populated }, 'Timetable entry created.');
});

exports.getTimetableByStudent = asyncHandler(async (req, res) => {
    const { studentId } = req.params;
    const { academicYear = '2025-2026' } = req.query;

    // Enrollment.student = User._id
    const enrollments = await Enrollment.find({
        student: studentId,
        academicYear,
        status: { $in: ['enrolled', 'completed'] },
    }).select('course');

    const courseIds = enrollments.map(e => e.course);
    const timetable = await Timetable.find({ course: { $in: courseIds }, academicYear, isActive: true })
        .populate(TIMETABLE_POPULATE)
        .sort({ dayOfWeek: 1, startTime: 1 });

    return ApiResponse.success(res, 200, { timetable });
});

exports.getTimetableByFaculty = asyncHandler(async (req, res) => {
    const { facultyId } = req.params;
    const { academicYear = '2025-2026' } = req.query;

    // Timetable.faculty = User._id
    const timetable = await Timetable.find({ faculty: facultyId, academicYear, isActive: true })
        .populate(TIMETABLE_POPULATE)
        .sort({ dayOfWeek: 1, startTime: 1 });

    return ApiResponse.success(res, 200, { timetable });
});

exports.getAllTimetable = asyncHandler(async (req, res) => {
    const { academicYear = '2025-2026', semester, faculty } = req.query;
    const query = { academicYear, isActive: true };
    if (semester) query.semester = Number(semester);
    if (faculty) query.faculty = faculty;

    const timetable = await Timetable.find(query)
        .populate(TIMETABLE_POPULATE)
        .sort({ dayOfWeek: 1, startTime: 1 });

    return ApiResponse.success(res, 200, { timetable });
});

exports.updateTimetable = asyncHandler(async (req, res) => {
    const existing = await Timetable.findById(req.params.id);
    if (!existing) throw ApiError.notFound('Timetable not found.');

    const payload = { ...existing.toObject(), ...req.body };
    if (!validateTimes(payload.startTime, payload.endTime)) {
        throw ApiError.badRequest('endTime must be after startTime.');
    }

    const conflicts = await findConflicts({ ...payload, excludeId: req.params.id });
    if (conflicts.length > 0) {
        return ApiResponse.error(res, 409, 'TIMETABLE_CONFLICT', 'Timetable update conflicts with an existing class.', { conflicts });
    }

    const timetable = await Timetable.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
        .populate(TIMETABLE_POPULATE);

    return ApiResponse.success(res, 200, { timetable }, 'Timetable entry updated.');
});

exports.deleteTimetable = asyncHandler(async (req, res) => {
    const timetable = await Timetable.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!timetable) throw ApiError.notFound('Timetable not found.');
    return ApiResponse.success(res, 200, { id: req.params.id }, 'Timetable entry deactivated.');
});
