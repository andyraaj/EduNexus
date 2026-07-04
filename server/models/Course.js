const mongoose = require('mongoose');

/**
 * Course model.
 * Central academic entity linking faculty, students (via Enrollment), and content.
 *
 * IMPORTANT: primaryFaculty now references User._id (not Faculty._id) for
 * consistency. The Faculty profile model stores extra metadata but the User _id
 * is the canonical foreign key everywhere.
 */
const courseSchema = new mongoose.Schema(
    {
        code: {
            type: String,
            required: [true, 'Course code is required'],
            unique: true,
            uppercase: true,
            trim: true,
        },
        title: {
            type: String,
            required: [true, 'Course title is required'],
            trim: true,
        },
        description: {
            type: String,
            default: '',
        },
        credits: {
            type: Number,
            required: true,
            min: [1, 'Credits must be at least 1'],
            max: [6, 'Credits cannot exceed 6'],
            default: 4,
        },
        department: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Department',
            required: [true, 'Department is required'],
        },
        semester: {
            type: Number,
            required: true,
            min: 1,
            max: 8,
        },
        primaryFaculty: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User', // Changed from 'Faculty' → 'User' for consistency
            default: null,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        maxEnrollment: {
            type: Number,
            default: 60,
        },
        syllabusProgress: {
            type: Number,
            default: 0,
            min: 0,
            max: 100,
        },
        syllabusUnits: {
            type: [
                {
                    title: String,
                    isCompleted: {
                        type: Boolean,
                        default: false,
                    },
                }
            ],
            default: [
                { title: 'Unit 1: Introduction & Basic Concepts', isCompleted: false },
                { title: 'Unit 2: Core Methodology & Frameworks', isCompleted: false },
                { title: 'Unit 3: Advanced Implementation Techniques', isCompleted: false },
                { title: 'Unit 4: Case Studies & Optimization Protocols', isCompleted: false },
                { title: 'Unit 5: Integration, Deployment & Capstone Reviews', isCompleted: false }
            ]
        }
    },
    { timestamps: true }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
courseSchema.index({ code: 1 });
courseSchema.index({ department: 1, semester: 1 });
courseSchema.index({ primaryFaculty: 1 });
courseSchema.index({ isActive: 1 });

module.exports = mongoose.model('Course', courseSchema);
