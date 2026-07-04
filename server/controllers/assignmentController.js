const assignmentService = require('../services/assignmentService');

const ok = (res, code, data, msg = 'Success') =>
    res.status(code).json({ success: true, message: msg, data, error: null });
const err = (res, e) =>
    res.status(e.status || 500).json({ success: false, data: null, error: { code: e.code || 'SERVER_ERROR', message: e.message } });

const getAssignmentsByCourse = async (req, res) => {
    try {
        const assignments = await assignmentService.getAssignmentsByCourse(req.user.id, req.user.role, req.params.courseId);
        return ok(res, 200, { assignments });
    } catch (e) { return err(res, e); }
};

const createAssignment = async (req, res) => {
    try {
        const { courseId, title, description, dueDate, maxMarks, attachmentUrl } = req.body;
        if (!courseId || !title || !dueDate || !maxMarks) {
            return res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'courseId, title, dueDate, maxMarks required.' } });
        }
        const assignment = await assignmentService.createAssignment(req.user.id, courseId, { title, description, dueDate, maxMarks, attachmentUrl });
        return ok(res, 201, { assignment }, 'Assignment created successfully.');
    } catch (e) { return err(res, e); }
};

const updateAssignment = async (req, res) => {
    try {
        const assignment = await assignmentService.updateAssignment(req.user.id, req.params.id, req.body);
        return ok(res, 200, { assignment }, 'Assignment updated successfully.');
    } catch (e) { return err(res, e); }
};

const deleteAssignment = async (req, res) => {
    try {
        await assignmentService.deleteAssignment(req.user.id, req.params.id);
        return ok(res, 200, null, 'Assignment deleted.');
    } catch (e) { return err(res, e); }
};

module.exports = { getAssignmentsByCourse, createAssignment, updateAssignment, deleteAssignment };
