const InstitutionSettings = require('../models/InstitutionSettings');
const Department = require('../models/Department');
const Program = require('../models/Program');
const Batch = require('../models/Batch');
const Section = require('../models/Section');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');

const parseActive = (value) => {
    if (value === undefined || value === 'all') return undefined;
    return value === true || value === 'true';
};

// ── Institution Settings ──────────────────────────────────────────────────────

const getSettings = asyncHandler(async (req, res) => {
    let settings = await InstitutionSettings.findOne({});
    if (!settings) settings = await InstitutionSettings.create({});
    return ApiResponse.success(res, 200, { settings });
});

const updateSettings = asyncHandler(async (req, res) => {
    const allowed = [
        'name', 'code', 'logoUrl', 'website', 'contactEmail', 'contactPhone',
        'address', 'activeAcademicYear', 'attendanceThreshold', 'defaultCurrency', 'gradingScheme',
    ];
    const payload = {};
    allowed.forEach((key) => {
        if (req.body[key] !== undefined) payload[key] = req.body[key];
    });

    const settings = await InstitutionSettings.findOneAndUpdate({}, payload, {
        new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true,
    });

    return ApiResponse.success(res, 200, { settings }, 'Institution settings updated.');
});

// ── Departments ───────────────────────────────────────────────────────────────

const listDepartments = asyncHandler(async (req, res) => {
    const query = {};
    const active = parseActive(req.query.isActive);
    if (active !== undefined) query.isActive = active;

    // Department.headOfDepartment = User._id — populate User directly
    const departments = await Department.find(query)
        .populate('headOfDepartment', 'name email role')
        .sort({ name: 1 });

    return ApiResponse.success(res, 200, { departments });
});

const createDepartment = asyncHandler(async (req, res) => {
    const { code, name } = req.body;
    if (!code || !name) throw ApiError.badRequest('code and name are required.');
    const department = await Department.create(req.body);
    return ApiResponse.success(res, 201, { department }, 'Department created.');
});

const updateDepartment = asyncHandler(async (req, res) => {
    const department = await Department.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!department) throw ApiError.notFound('Department not found.');
    return ApiResponse.success(res, 200, { department }, 'Department updated.');
});

// ── Programs ──────────────────────────────────────────────────────────────────

const listPrograms = asyncHandler(async (req, res) => {
    const query = {};
    const active = parseActive(req.query.isActive);
    if (active !== undefined) query.isActive = active;
    if (req.query.department) query.department = req.query.department;

    const programs = await Program.find(query)
        .populate('department', 'code name')
        .sort({ name: 1 });

    return ApiResponse.success(res, 200, { programs });
});

const createProgram = asyncHandler(async (req, res) => {
    const { code, name, department } = req.body;
    if (!code || !name || !department) throw ApiError.badRequest('code, name, and department are required.');
    const program = await Program.create(req.body);
    return ApiResponse.success(res, 201, { program }, 'Program created.');
});

const updateProgram = asyncHandler(async (req, res) => {
    const program = await Program.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!program) throw ApiError.notFound('Program not found.');
    return ApiResponse.success(res, 200, { program }, 'Program updated.');
});

// ── Batches ───────────────────────────────────────────────────────────────────

const listBatches = asyncHandler(async (req, res) => {
    const query = {};
    const active = parseActive(req.query.isActive);
    if (active !== undefined) query.isActive = active;
    if (req.query.program) query.program = req.query.program;

    const batches = await Batch.find(query)
        .populate({ path: 'program', select: 'code name department', populate: { path: 'department', select: 'code name' } })
        .sort({ startYear: -1 });

    return ApiResponse.success(res, 200, { batches });
});

const createBatch = asyncHandler(async (req, res) => {
    const { name, program, academicYear, startYear, endYear } = req.body;
    if (!name || !program || !academicYear || !startYear || !endYear) {
        throw ApiError.badRequest('name, program, academicYear, startYear, and endYear are required.');
    }
    if (Number(endYear) < Number(startYear)) {
        throw ApiError.badRequest('endYear must be greater than or equal to startYear.');
    }
    const batch = await Batch.create(req.body);
    return ApiResponse.success(res, 201, { batch }, 'Batch created.');
});

const updateBatch = asyncHandler(async (req, res) => {
    if (req.body.startYear && req.body.endYear && Number(req.body.endYear) < Number(req.body.startYear)) {
        throw ApiError.badRequest('endYear must be greater than or equal to startYear.');
    }
    const batch = await Batch.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!batch) throw ApiError.notFound('Batch not found.');
    return ApiResponse.success(res, 200, { batch }, 'Batch updated.');
});

// ── Sections ──────────────────────────────────────────────────────────────────

const listSections = asyncHandler(async (req, res) => {
    const query = {};
    const active = parseActive(req.query.isActive);
    if (active !== undefined) query.isActive = active;
    if (req.query.batch) query.batch = req.query.batch;

    // Section.classAdvisor = User._id — populate User directly
    const sections = await Section.find(query)
        .populate({ path: 'batch', select: 'name academicYear program', populate: { path: 'program', select: 'code name' } })
        .populate('classAdvisor', 'name email role')
        .sort({ semester: 1, name: 1 });

    return ApiResponse.success(res, 200, { sections });
});

const createSection = asyncHandler(async (req, res) => {
    const { name, batch, semester } = req.body;
    if (!name || !batch || !semester) throw ApiError.badRequest('name, batch, and semester are required.');
    const section = await Section.create(req.body);
    return ApiResponse.success(res, 201, { section }, 'Section created.');
});

const updateSection = asyncHandler(async (req, res) => {
    const section = await Section.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!section) throw ApiError.notFound('Section not found.');
    return ApiResponse.success(res, 200, { section }, 'Section updated.');
});

module.exports = {
    getSettings, updateSettings,
    listDepartments, createDepartment, updateDepartment,
    listPrograms, createProgram, updateProgram,
    listBatches, createBatch, updateBatch,
    listSections, createSection, updateSection,
};
