const mongoose = require('mongoose');

const sectionSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        batch: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Batch',
            required: true,
        },
        semester: {
            type: Number,
            required: true,
            min: 1,
            max: 12,
        },
        classAdvisor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User', // Changed from 'Faculty' → 'User' for consistency
            default: null,
        },
        room: {
            type: String,
            default: '',
            trim: true,
        },
        capacity: {
            type: Number,
            default: 60,
            min: 1,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

sectionSchema.index({ batch: 1, semester: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Section', sectionSchema);
