const mongoose = require('mongoose');

/**
 * Student — profile extension for users with role 'student'.
 * The User model is the primary identity; this stores academic metadata.
 * Department is now an ObjectId reference to the Department model.
 */
const studentSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    rollNumber: {
        type: String,
        required: true,
        unique: true
    },
    department: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department', // Changed from String → ObjectId ref for relational integrity
        required: true
    },
    semester: {
        type: Number,
        required: true
    },
    batchYear: {
        type: Number,
        required: true
    }
}, { timestamps: true });

studentSchema.index({ department: 1, semester: 1 });

module.exports = mongoose.model('Student', studentSchema);
