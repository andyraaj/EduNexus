const mongoose = require('mongoose');

/**
 * Timetable — schedules for courses.
 * Tracks when courses are held during the week.
 */
const timetableSchema = new mongoose.Schema({
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true,
    },
    faculty: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Changed from 'Faculty' → 'User' for consistency
        required: true,
    },
    dayOfWeek: {
        type: String,
        enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        required: true,
    },
    startTime: {
        type: String, // e.g., "09:00"
        required: true,
    },
    endTime: {
        type: String, // e.g., "10:30"
        required: true,
    },
    classroom: {
        type: String, // e.g., "Room 101"
        required: true,
    },
    semester: {
        type: Number,
        required: true,
        min: 1,
        max: 8,
    },
    academicYear: {
        type: String, // "2025-2026"
        required: true,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
}, { timestamps: true });

// Indexes for quick lookups
timetableSchema.index({ course: 1, academicYear: 1 });
timetableSchema.index({ faculty: 1, academicYear: 1 });
timetableSchema.index({ dayOfWeek: 1, startTime: 1, academicYear: 1 });

module.exports = mongoose.model('Timetable', timetableSchema);
