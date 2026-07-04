const mongoose = require('mongoose');

const programSchema = new mongoose.Schema(
    {
        code: {
            type: String,
            required: true,
            uppercase: true,
            trim: true,
            unique: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        department: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Department',
            required: true,
        },
        level: {
            type: String,
            enum: ['certificate', 'diploma', 'undergraduate', 'postgraduate', 'doctoral'],
            default: 'undergraduate',
        },
        durationSemesters: {
            type: Number,
            min: 1,
            max: 12,
            default: 8,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

programSchema.index({ department: 1, isActive: 1 });

module.exports = mongoose.model('Program', programSchema);
