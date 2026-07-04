const express = require('express');
const router = express.Router();
const AuditLog = require('../models/AuditLog');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/', protect, authorize('admin'), async (req, res, next) => {
    try {
        const limit = Math.min(Number(req.query.limit || 100), 250);
        const query = {};
        if (req.query.category && req.query.category !== 'all') query.category = req.query.category;
        if (req.query.actorRole && req.query.actorRole !== 'all') query.actorRole = req.query.actorRole;
        const logs = await AuditLog.find(query)
            .populate('actor', 'name email role')
            .sort({ createdAt: -1 })
            .limit(limit);

        res.status(200).json({
            success: true,
            message: 'Success',
            data: { logs },
            error: null,
            requestId: req.requestId,
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
