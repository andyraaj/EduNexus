const mongoose = require('mongoose');

/**
 * Enrollment — junction collection linking a Student to a Course for a given academic year/semester.
 * Avoids embedding an unbounded array of students inside the Course document.
 */
const enrollmentSchema = new mongoose.Schema(
    {
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        course: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Course',
            required: true,
        },
        // Academic year e.g. "2025-2026"
        academicYear: {
            type: String,
            required: true,
        },
        semester: {
            type: Number,
            required: true,
            min: 1,
            max: 8,
        },
        status: {
            type: String,
            enum: ['enrolled', 'dropped', 'completed'],
            default: 'enrolled',
        },
        enrolledAt: {
            type: Date,
            default: Date.now,
        },
    },
    { timestamps: true }
);

// ── Indexes ────────────────────────────────────────────────────────────────────
// Prevent duplicate enrollment of the same student in the same course / year
enrollmentSchema.index({ student: 1, course: 1, academicYear: 1 }, { unique: true });
// Fast roster lookup: "all students in course X this year"
enrollmentSchema.index({ course: 1, academicYear: 1, status: 1 });
// Fast dashboard lookup: "all courses student X is enrolled in"
enrollmentSchema.index({ student: 1, academicYear: 1, status: 1 });

module.exports = mongoose.model('Enrollment', enrollmentSchema);
