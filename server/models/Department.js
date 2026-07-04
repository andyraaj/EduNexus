const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema(
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
        description: {
            type: String,
            default: '',
            trim: true,
        },
        headOfDepartment: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User', // Changed from 'Faculty' → 'User' for consistency
            default: null,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

departmentSchema.index({ isActive: 1, name: 1 });

module.exports = mongoose.model('Department', departmentSchema);
