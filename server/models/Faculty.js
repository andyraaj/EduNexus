const mongoose = require('mongoose');

/**
 * Faculty — profile extension for users with role 'faculty'.
 * The User model is the primary identity; this stores employment metadata.
 * Department is now an ObjectId reference to the Department model.
 */
const facultySchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    employeeId: {
        type: String,
        required: true,
        unique: true
    },
    department: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department', // Changed from String → ObjectId ref for relational integrity
        required: true
    },
    designation: {
        type: String,
        required: true
    }
}, { timestamps: true });

facultySchema.index({ department: 1 });

module.exports = mongoose.model('Faculty', facultySchema);
