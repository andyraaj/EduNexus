const attemptService = require('../services/attemptService');

const ok = (res, code, data, msg = 'Success') => res.status(code).json({ success: true, message: msg, data, error: null });
const err = (res, e) => res.status(e.status || 500).json({ success: false, data: null, error: { code: e.code || 'SERVER_ERROR', message: e.message } });

const startQuiz = async (req, res) => {
    try {
        const attempt = await attemptService.startQuiz(req.user.id, req.params.id);
        return ok(res, 201, { attempt }, 'Quiz started.');
    } catch (e) { return err(res, e); }
};

const submitQuiz = async (req, res) => {
    try {
        const { answers } = req.body;
        if (!answers || typeof answers !== 'object') {
            return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Answers payload missing or invalid.' } });
        }
        const result = await attemptService.submitQuiz(req.user.id, req.params.id, answers);
        return ok(res, 200, result, 'Quiz submitted successfully.');
    } catch (e) { return err(res, e); }
};

const getMyAttempts = async (req, res) => {
    try {
        const attempts = await attemptService.getMyAttempts(req.user.id);
        return ok(res, 200, { attempts });
    } catch (e) { return err(res, e); }
};

const getQuizAttemptsForFaculty = async (req, res) => {
    try {
        const attempts = await attemptService.getQuizAttemptsForFaculty(req.user.id, req.params.quizId);
        return ok(res, 200, { attempts });
    } catch (e) { return err(res, e); }
};

module.exports = {
    startQuiz, submitQuiz, getMyAttempts, getQuizAttemptsForFaculty
};
