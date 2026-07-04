const analyticsService = require('../services/analyticsService');

const ok = (res, code, data, msg = 'Success') => res.status(code).json({ success: true, message: msg, data, error: null });
const err = (res, e) => res.status(e.status || 500).json({ success: false, data: null, error: { code: e.code || 'SERVER_ERROR', message: e.message } });

const getStudentAnalytics = async (req, res) => {
    try {
        const stats = await analyticsService.getStudentAnalytics(req.user.id);
        return ok(res, 200, stats);
    } catch (e) { return err(res, e); }
};

const getFacultyAnalytics = async (req, res) => {
    try {
        const { courseId } = req.params;
        if (!courseId) return res.status(400).json({ success: false, error: { code: 'MISSING_DATA', message: 'courseId required' } });
        
        const stats = await analyticsService.getFacultyAnalytics(req.user.id, courseId);
        return ok(res, 200, stats);
    } catch (e) { return err(res, e); }
};

const getAdminAnalytics = async (req, res) => {
    try {
        const stats = await analyticsService.getAdminAnalytics();
        return ok(res, 200, stats);
    } catch (e) { return err(res, e); }
};

module.exports = {
    getStudentAnalytics,
    getFacultyAnalytics,
    getAdminAnalytics
};
