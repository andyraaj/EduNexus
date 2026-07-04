const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
    {
        actor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        actorRole: {
            type: String,
            default: 'anonymous',
        },
        action: {
            type: String,
            required: true,
        },
        category: {
            type: String,
            enum: ['auth', 'admin_write', 'faculty_write', 'student_write', 'public_write', 'system'],
            default: 'system',
        },
        method: {
            type: String,
            required: true,
        },
        path: {
            type: String,
            required: true,
        },
        statusCode: {
            type: Number,
            required: true,
        },
        ip: {
            type: String,
            default: '',
        },
        userAgent: {
            type: String,
            default: '',
        },
        requestId: {
            type: String,
            default: '',
        },
        requestSummary: {
            type: mongoose.Schema.Types.Mixed,
            default: null,
        },
    },
    { timestamps: true }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ actor: 1, createdAt: -1 });
auditLogSchema.index({ actorRole: 1, createdAt: -1 });
auditLogSchema.index({ category: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
