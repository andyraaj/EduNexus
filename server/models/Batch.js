const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        program: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Program',
            required: true,
        },
        academicYear: {
            type: String,
            required: true,
            trim: true,
        },
        startYear: {
            type: Number,
            required: true,
        },
        endYear: {
            type: Number,
            required: true,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

batchSchema.index({ program: 1, academicYear: 1 }, { unique: true });

module.exports = mongoose.model('Batch', batchSchema);
