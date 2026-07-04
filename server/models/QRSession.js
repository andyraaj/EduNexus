const mongoose = require('mongoose');

/**
 * QRSession — Represents a live attendance-collection session.
 * Faculty generates a QR code tied to this document.
 * Students scan the QR → system validates and creates an AttendanceRecord entry.
 */
const qrSessionSchema = new mongoose.Schema(
    {
        // ── Session Identity ──────────────────────────────────────────────────
        course: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Course',
            required: true,
        },
        faculty: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },

        // ── Session Metadata ─────────────────────────────────────────────────
        sessionLabel: {
            type: String,
            default: 'Lecture',   // e.g. "Lecture 12", "Lab Session 4"
        },
        topic: {
            type: String,
            default: '',
        },
        room: {
            type: String,
            default: '',
        },

        // ── QR Token (signed, hashed for DB storage) ─────────────────────────
        /** Raw token embedded in the QR code — signed JWT-like payload */
        token: {
            type: String,
            required: true,
            unique: true,
        },

        // ── Timing ────────────────────────────────────────────────────────────
        startedAt: {
            type: Date,
            default: Date.now,
        },
        expiresAt: {
            type: Date,
            required: true,
        },
        /** Late threshold: after X ms from startedAt, entries are flagged 'late' */
        lateAfterMs: {
            type: Number,
            default: 10 * 60 * 1000, // 10 minutes
        },

        // ── Status ────────────────────────────────────────────────────────────
        status: {
            type: String,
            enum: ['active', 'paused', 'ended'],
            default: 'active',
        },

        // ── Scans (embedded sub-docs for fast live read) ──────────────────────
        scans: [
            {
                student: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'User',
                    required: true,
                },
                scannedAt: {
                    type: Date,
                    default: Date.now,
                },
                attendanceStatus: {
                    type: String,
                    enum: ['present', 'late'],
                    default: 'present',
                },
                deviceInfo: {
                    type: String,
                    default: '',
                },
                ipAddress: {
                    type: String,
                    default: '',
                },
            },
        ],
    },
    { timestamps: true }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
qrSessionSchema.index({ token: 1 });
qrSessionSchema.index({ course: 1, status: 1 });
qrSessionSchema.index({ faculty: 1, startedAt: -1 });
qrSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 86400 }); // Auto-delete after 24h

module.exports = mongoose.model('QRSession', qrSessionSchema);
