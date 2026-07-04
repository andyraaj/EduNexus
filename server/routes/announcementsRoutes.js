const express = require('express');
const router = express.Router();
const Notice = require('../models/Notice');
const { protect, authorize } = require('../middleware/authMiddleware');

const ok = (res, code, data, msg = 'Success') => res.status(code).json({ success: true, message: msg, data, error: null });
const fail = (res, code, message, errCode = 'ERROR') => res.status(code).json({ success: false, data: null, error: { code: errCode, message } });

// @desc    Get all announcements
// @route   GET /api/announcements
router.get('/', protect, async (req, res) => {
    try {
        const { category } = req.query;
        let query = {};

        if (category && category !== 'all') {
            query.category = category;
        }

        // Filter by audience: if student, exclude faculty-only notices
        if (req.user.role === 'student') {
            query.targetAudience = { $in: ['all', 'student'] };
        } else if (req.user.role === 'faculty') {
            query.targetAudience = { $in: ['all', 'faculty'] };
        }

        const notices = await Notice.find(query)
            .sort({ createdAt: -1 })
            .populate('postedBy', 'name role');

        return ok(res, 200, { notices });
    } catch (error) {
        console.error(error);
        return fail(res, 500, 'Server Error', 'SERVER_ERROR');
    }
});

// @desc    Get one announcement
// @route   GET /api/announcements/:id
router.get('/:id', protect, async (req, res) => {
    try {
        const notice = await Notice.findById(req.params.id).populate('postedBy', 'name role');
        if (!notice) return fail(res, 404, 'Notice not found', 'NOT_FOUND');
        return ok(res, 200, { notice });
    } catch (error) {
        console.error(error);
        return fail(res, 500, 'Server Error', 'SERVER_ERROR');
    }
});

// @desc    Create announcement
// @route   POST /api/announcements
router.post('/', protect, authorize('faculty', 'admin'), async (req, res) => {
    try {
        const { title, content, category, targetAudience } = req.body;
        if (!title || !content) return fail(res, 400, 'title and content are required.', 'MISSING_FIELDS');

        const notice = await Notice.create({
            title,
            content,
            category: category || 'General',
            postedBy: req.user.id,
            targetAudience: targetAudience || 'all'
        });

        await notice.populate('postedBy', 'name role');

        // Broadcast via Socket.IO (legacy — for real-time page refresh)
        try {
            const { getIO } = require('../socketServer');
            getIO().emit('new_announcement', notice);
        } catch (e) {
            console.error('Socket error emitting announcement:', e);
        }

        // Create per-user DB notifications + emit to personal rooms
        try {
            const { broadcastAnnouncement } = require('../services/notificationService');
            await broadcastAnnouncement(
                title,
                content,
                targetAudience || 'all',
                notice.postedBy?.name || 'Admin'
            );
        } catch (e) {
            console.error('Error broadcasting announcement notification:', e.message);
        }

        return ok(res, 201, { notice }, 'Announcement created.');

    } catch (error) {
        console.error(error);
        return fail(res, 500, 'Server Error', 'SERVER_ERROR');
    }
});

// @desc    Update announcement
// @route   PUT /api/announcements/:id
router.put('/:id', protect, authorize('faculty', 'admin'), async (req, res) => {
    try {
        const notice = await Notice.findById(req.params.id);
        if (!notice) return fail(res, 404, 'Notice not found', 'NOT_FOUND');

        // Faculty can only edit their own posts; admin can edit all.
        if (req.user.role !== 'admin' && notice.postedBy?.toString() !== req.user.id) {
            return fail(res, 403, 'Forbidden', 'FORBIDDEN');
        }

        const { title, content, category, targetAudience } = req.body;
        if (title !== undefined) notice.title = title;
        if (content !== undefined) notice.content = content;
        if (category !== undefined) notice.category = category;
        if (targetAudience !== undefined) notice.targetAudience = targetAudience;

        await notice.save();
        await notice.populate('postedBy', 'name role');
        return ok(res, 200, { notice }, 'Announcement updated.');
    } catch (error) {
        console.error(error);
        return fail(res, 500, 'Server Error', 'SERVER_ERROR');
    }
});

// @desc    Delete announcement
// @route   DELETE /api/announcements/:id
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const notice = await Notice.findByIdAndDelete(req.params.id);
        if (!notice) {
            return fail(res, 404, 'Notice not found', 'NOT_FOUND');
        }
        return ok(res, 200, { id: req.params.id }, 'Notice deleted.');
    } catch (error) {
        console.error(error);
        return fail(res, 500, 'Server Error', 'SERVER_ERROR');
    }
});

module.exports = router;
