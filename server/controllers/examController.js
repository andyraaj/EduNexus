const ExamEvent = require('../models/ExamEvent');

const ok = (res, status, data, message = 'Success') => {
    res.status(status).json({ success: true, message, data, error: null, requestId: res.getHeader('X-Request-Id') });
};

const fail = (res, status, code, message) => {
    res.status(status).json({ success: false, data: null, error: { code, message }, requestId: res.getHeader('X-Request-Id') });
};

const buildQuery = (req) => {
    const query = {};
    const { status, from, to, courseId } = req.query;

    if (req.user.role !== 'admin') {
        query.status = 'published';
        query.targetAudience = { $in: ['all', req.user.role] };
    } else if (status && status !== 'all') {
        query.status = status;
    }

    if (courseId) query.course = courseId;

    if (from || to) {
        query.startsAt = {};
        if (from) query.startsAt.$gte = new Date(from);
        if (to) query.startsAt.$lte = new Date(to);
    }

    return query;
};

const getExamEvents = async (req, res, next) => {
    try {
        const events = await ExamEvent.find(buildQuery(req))
            .populate('course', 'code title department semester')
            .populate('createdBy', 'name role')
            .sort({ startsAt: 1 })
            .limit(200);

        ok(res, 200, { events });
    } catch (err) {
        next(err);
    }
};

const createExamEvent = async (req, res, next) => {
    try {
        const { title, course, type, startsAt, endsAt, venue, instructions, targetAudience, status } = req.body;

        if (!title || !startsAt || !endsAt) {
            return fail(res, 400, 'MISSING_FIELDS', 'title, startsAt, and endsAt are required.');
        }

        const start = new Date(startsAt);
        const end = new Date(endsAt);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
            return fail(res, 400, 'INVALID_SCHEDULE', 'End date/time must be after start date/time.');
        }

        const event = await ExamEvent.create({
            title,
            course: course || null,
            type,
            startsAt: start,
            endsAt: end,
            venue,
            instructions,
            targetAudience,
            status,
            createdBy: req.user.id,
        });

        const populated = await event.populate([
            { path: 'course', select: 'code title department semester' },
            { path: 'createdBy', select: 'name role' },
        ]);

        // Notify relevant audience when event is published
        if (status === 'published') {
            try {
                const { broadcastAnnouncement } = require('../services/notificationService');
                const typeLabel = type === 'final' ? 'Final Exam' : type === 'midterm' ? 'Mid-Term Exam'
                    : type === 'internal' ? 'Internal Assessment' : type === 'practical' ? 'Practical Exam'
                    : type === 'viva' ? 'Viva/Oral Exam' : 'Academic Event';
                const dateStr = start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
                const audience = targetAudience === 'student' ? 'student' : targetAudience === 'faculty' ? 'faculty' : 'all';
                await broadcastAnnouncement(
                    `📅 ${typeLabel}: ${title}`,
                    `Scheduled on ${dateStr}${venue ? ` at ${venue}` : ''}. Check the Academic Calendar for full details.`,
                    audience,
                    'Academic Office'
                );
            } catch (notifErr) {
                console.error('[ExamEvent Notification] Failed:', notifErr.message);
            }
        }

        ok(res, 201, { event: populated }, 'Academic event created.');
    } catch (err) {
        next(err);
    }
};

const updateExamEvent = async (req, res, next) => {
    try {
        const updates = { ...req.body };
        if (updates.startsAt) updates.startsAt = new Date(updates.startsAt);
        if (updates.endsAt) updates.endsAt = new Date(updates.endsAt);

        if (updates.startsAt && updates.endsAt && updates.endsAt <= updates.startsAt) {
            return fail(res, 400, 'INVALID_SCHEDULE', 'End date/time must be after start date/time.');
        }

        const event = await ExamEvent.findByIdAndUpdate(req.params.id, updates, {
            new: true,
            runValidators: true,
        })
            .populate('course', 'code title department semester')
            .populate('createdBy', 'name role');

        if (!event) return fail(res, 404, 'NOT_FOUND', 'Academic event not found.');
        ok(res, 200, { event }, 'Academic event updated.');
    } catch (err) {
        next(err);
    }
};

const deleteExamEvent = async (req, res, next) => {
    try {
        const event = await ExamEvent.findByIdAndDelete(req.params.id);
        if (!event) return fail(res, 404, 'NOT_FOUND', 'Academic event not found.');
        ok(res, 200, { id: req.params.id }, 'Academic event deleted.');
    } catch (err) {
        next(err);
    }
};

module.exports = { getExamEvents, createExamEvent, updateExamEvent, deleteExamEvent };
