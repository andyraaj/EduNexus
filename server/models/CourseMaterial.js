const mongoose = require('mongoose');

/**
 * CourseMaterial — Upgraded for real LMS file management.
 * Supports actual uploaded files (via multer) AND external links.
 */
const courseMaterialSchema = new mongoose.Schema(
    {
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
        title: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            trim: true,
            default: '',
        },

        // ── File Storage ──────────────────────────────────────────────
        fileUrl: {
            type: String,
            required: true, // Cloudinary HTTPS URL (uploaded files) or external URL (links)
        },
        // Cloudinary public_id — needed to delete the cloud asset on material removal
        cloudinaryPublicId: {
            type: String,
            default: null,
        },
        // Cloudinary resource type: 'image' | 'raw' | 'video'
        cloudinaryResourceType: {
            type: String,
            default: 'raw',
        },
        fileName: {
            type: String,
            default: '',
        },
        fileSize: {
            type: Number, // bytes
            default: 0,
        },
        mimeType: {
            type: String,
            default: '',
        },
        isExternalLink: {
            type: Boolean,
            default: false, // true = Google Drive / YouTube link
        },

        // ── LMS Organization ─────────────────────────────────────────
        category: {
            type: String,
            enum: ['notes', 'slides', 'video', 'assignment_resource', 'lab_manual', 'reference', 'recording', 'other'],
            default: 'notes',
        },
        module: {
            type: String,
            default: 'General',
            trim: true,
        },
        isPinned: {
            type: Boolean,
            default: false,
        },
        isVisible: {
            type: Boolean,
            default: true, // faculty can hide materials temporarily
        },

        // ── Analytics ────────────────────────────────────────────────
        downloadCount: {
            type: Number,
            default: 0,
        },
        uploadedAt: {
            type: Date,
            default: Date.now,
        },
    },
    { timestamps: true }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
courseMaterialSchema.index({ course: 1, module: 1, uploadedAt: -1 });
courseMaterialSchema.index({ course: 1, isPinned: -1, uploadedAt: -1 });
courseMaterialSchema.index({ course: 1, isVisible: 1 });

module.exports = mongoose.model('CourseMaterial', courseMaterialSchema);
