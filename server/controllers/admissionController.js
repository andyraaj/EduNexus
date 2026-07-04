const AdmissionApplication = require('../models/AdmissionApplication');
const Program = require('../models/Program');
const Student = require('../models/Student');
const User = require('../models/User');
const Department = require('../models/Department');

const ok = (res, status, data, message = 'Success', meta) => {
    res.status(status).json({ success: true, message, data, meta: meta || undefined, error: null, requestId: res.getHeader('X-Request-Id') });
};

const fail = (res, status, code, message) => {
    res.status(status).json({ success: false, data: null, error: { code, message }, requestId: res.getHeader('X-Request-Id') });
};

const terminalStatuses = new Set(['enrolled', 'rejected', 'withdrawn']);

const buildQuery = ({ status, search, academicYear, program }) => {
    const query = {};
    if (status && status !== 'all') query.status = status;
    if (academicYear) query.academicYear = academicYear;
    if (program) query.program = program;
    if (search) {
        query.$or = [
            { applicantName: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { phone: { $regex: search, $options: 'i' } },
        ];
    }
    return query;
};

const listApplications = async (req, res, next) => {
    try {
        const { status = 'all', search = '', academicYear, program, page = 1, limit = 25 } = req.query;
        const safeLimit = Math.min(Number(limit) || 25, 100);
        const safePage = Math.max(Number(page) || 1, 1);
        const query = buildQuery({ status, search, academicYear, program });

        const [applications, total] = await Promise.all([
            AdmissionApplication.find(query)
                .populate({ path: 'program', select: 'code name department', populate: { path: 'department', select: 'code name' } })
                .populate('reviewedBy', 'name email role')
                .sort({ updatedAt: -1 })
                .skip((safePage - 1) * safeLimit)
                .limit(safeLimit),
            AdmissionApplication.countDocuments(query),
        ]);

        ok(res, 200, { applications }, 'Admissions fetched.', {
            page: safePage,
            limit: safeLimit,
            totalRecords: total,
            totalPages: Math.ceil(total / safeLimit),
        });
    } catch (err) {
        next(err);
    }
};

const createApplication = async (req, res, next) => {
    try {
        const { applicantName, email, phone, program, academicYear, status, source, documents, notes } = req.body;
        if (!applicantName || !email || !phone || !program || !academicYear) {
            return fail(res, 400, 'MISSING_FIELDS', 'applicantName, email, phone, program, and academicYear are required.');
        }

        const programExists = await Program.exists({ _id: program, isActive: true });
        if (!programExists) return fail(res, 404, 'PROGRAM_NOT_FOUND', 'Active program not found.');

        const application = await AdmissionApplication.create({
            applicantName,
            email,
            phone,
            program,
            academicYear,
            status: status || 'inquiry',
            source: source || 'direct',
            documents: Array.isArray(documents) ? documents : [],
            notes: notes || '',
            reviewedBy: req.user?.id || null,
        });
        await application.populate({ path: 'program', select: 'code name department', populate: { path: 'department', select: 'code name' } });

        ok(res, 201, { application }, 'Admission application created.');
    } catch (err) {
        next(err);
    }
};

const listPublicPrograms = async (req, res, next) => {
    try {
        const programs = await Program.find({ isActive: true })
            .select('code name department level durationSemesters')
            .populate('department', 'code name')
            .sort({ name: 1 });
        ok(res, 200, { programs });
    } catch (err) {
        next(err);
    }
};

const submitPublicApplication = async (req, res, next) => {
    try {
        const { applicantName, email, phone, program, academicYear, source, notes } = req.body;
        if (!applicantName || !email || !phone || !program || !academicYear) {
            return fail(res, 400, 'MISSING_FIELDS', 'applicantName, email, phone, program, and academicYear are required.');
        }

        const programExists = await Program.exists({ _id: program, isActive: true });
        if (!programExists) return fail(res, 404, 'PROGRAM_NOT_FOUND', 'Active program not found.');

        const existingOpenApplication = await AdmissionApplication.findOne({
            email,
            program,
            academicYear,
            status: { $nin: ['rejected', 'withdrawn'] },
        });
        if (existingOpenApplication) {
            return fail(res, 409, 'DUPLICATE_APPLICATION', 'An open application already exists for this email, program, and academic year.');
        }

        const application = await AdmissionApplication.create({
            applicantName,
            email,
            phone,
            program,
            academicYear,
            status: 'application',
            source: source || 'public_form',
            notes: notes || '',
            documents: [
                { label: 'Identity proof', status: 'pending' },
                { label: 'Previous academic records', status: 'pending' },
                { label: 'Transfer or migration certificate', status: 'pending' },
            ],
        });
        await application.populate({ path: 'program', select: 'code name department', populate: { path: 'department', select: 'code name' } });

        ok(res, 201, { application }, 'Application submitted.');
    } catch (err) {
        next(err);
    }
};

const updateApplication = async (req, res, next) => {
    try {
        const allowed = ['applicantName', 'email', 'phone', 'program', 'academicYear', 'status', 'source', 'documents', 'notes'];
        const payload = {};
        allowed.forEach((key) => {
            if (req.body[key] !== undefined) payload[key] = req.body[key];
        });
        if (payload.status) {
            payload.reviewedBy = req.user.id;
            payload.decidedAt = terminalStatuses.has(payload.status) ? new Date() : null;
        }

        const application = await AdmissionApplication.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true })
            .populate({ path: 'program', select: 'code name department', populate: { path: 'department', select: 'code name' } })
            .populate('reviewedBy', 'name email role');
        if (!application) return fail(res, 404, 'NOT_FOUND', 'Admission application not found.');

        ok(res, 200, { application }, 'Admission application updated.');
    } catch (err) {
        next(err);
    }
};

const updateApplicationDocuments = async (req, res, next) => {
    try {
        const { documents } = req.body;
        if (!Array.isArray(documents)) return fail(res, 400, 'MISSING_FIELDS', 'documents must be an array.');

        const application = await AdmissionApplication.findByIdAndUpdate(
            req.params.id,
            { documents, reviewedBy: req.user.id },
            { new: true, runValidators: true }
        )
            .populate({ path: 'program', select: 'code name department', populate: { path: 'department', select: 'code name' } })
            .populate('reviewedBy', 'name email role');
        if (!application) return fail(res, 404, 'NOT_FOUND', 'Admission application not found.');

        ok(res, 200, { application }, 'Admission documents updated.');
    } catch (err) {
        next(err);
    }
};

const advanceApplication = async (req, res, next) => {
    try {
        const { status, notes } = req.body;
        if (!status) return fail(res, 400, 'MISSING_FIELDS', 'status is required.');

        const payload = {
            status,
            reviewedBy: req.user.id,
            decidedAt: terminalStatuses.has(status) ? new Date() : null,
        };
        if (notes !== undefined) payload.notes = notes;

        const application = await AdmissionApplication.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true })
            .populate({ path: 'program', select: 'code name department', populate: { path: 'department', select: 'code name' } })
            .populate('reviewedBy', 'name email role');
        if (!application) return fail(res, 404, 'NOT_FOUND', 'Admission application not found.');

        ok(res, 200, { application }, 'Admission status updated.');
    } catch (err) {
        next(err);
    }
};

const convertApplicationToStudent = async (req, res, next) => {
    try {
        const application = await AdmissionApplication.findById(req.params.id)
            .populate({ path: 'program', select: 'code name department', populate: { path: 'department', select: 'code name' } });
        if (!application) return fail(res, 404, 'NOT_FOUND', 'Admission application not found.');
        if (application.convertedUser) return fail(res, 409, 'ALREADY_CONVERTED', 'This application is already converted to a student.');
        if (!['offer', 'enrolled'].includes(application.status)) {
            return fail(res, 400, 'INVALID_STATUS', 'Only offered or enrolled applications can be converted.');
        }

        const existingUser = await User.findOne({ email: application.email });
        if (existingUser) return fail(res, 409, 'USER_EXISTS', 'A user with this applicant email already exists.');

        const year = Number(String(application.academicYear).slice(0, 4)) || new Date().getFullYear();
        const rollNumber = `ADM${year}${Date.now().toString().slice(-6)}`;
        const temporaryPassword = `EduNexus@${Date.now().toString().slice(-6)}`;

        const user = await User.create({
            name: application.applicantName,
            email: application.email,
            password: temporaryPassword,
            role: 'student',
        });

        const deptId = application.program?.department?._id || application.program?.department;
        let finalDeptId = deptId;
        if (!finalDeptId) {
            const defaultDept = await Department.findOne();
            if (!defaultDept) {
                return fail(res, 400, 'NO_DEPARTMENTS', 'No departments found in the system. Please create a department first.');
            }
            finalDeptId = defaultDept._id;
        }

        const student = await Student.create({
            user: user._id,
            rollNumber,
            department: finalDeptId,
            semester: 1,
            batchYear: year,
        });

        application.status = 'enrolled';
        application.reviewedBy = req.user.id;
        application.decidedAt = application.decidedAt || new Date();
        application.convertedUser = user._id;
        application.convertedStudent = student._id;
        application.convertedAt = new Date();
        application.notes = [application.notes, `Converted to student roll ${rollNumber}. Temporary password: ${temporaryPassword}`]
            .filter(Boolean)
            .join('\n');
        await application.save();
        await application.populate([
            { path: 'program', select: 'code name department', populate: { path: 'department', select: 'code name' } },
            { path: 'reviewedBy', select: 'name email role' },
            { path: 'convertedUser', select: 'name email role' },
            { path: 'convertedStudent', select: 'rollNumber department semester batchYear' },
        ]);

        ok(res, 200, { application, user: { id: user._id, email: user.email, temporaryPassword }, student }, 'Application converted to student.');
    } catch (err) {
        next(err);
    }
};

module.exports = {
    listApplications,
    createApplication,
    listPublicPrograms,
    submitPublicApplication,
    updateApplication,
    updateApplicationDocuments,
    advanceApplication,
    convertApplicationToStudent,
};
