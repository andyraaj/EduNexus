const mongoose = require('mongoose');

/**
 * Announcement — per-course announcements posted by faculty.
 * Visible to all enrolled students in that course.
 */
const announcementSchema = new mongoose.Schema(
    {
        course: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Course',
            required: true,
        },
        postedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 200,
        },
        body: {
            type: String,
            required: true,
            trim: true,
        },
        priority: {
            type: String,
            enum: ['normal', 'important', 'urgent'],
            default: 'normal',
        },
        isPinned: {
            type: Boolean,
            default: false,
        },
        attachmentUrl: {
            type: String,
            default: null,
        },
    },
    { timestamps: true }
);

announcementSchema.index({ course: 1, createdAt: -1 });
announcementSchema.index({ course: 1, isPinned: -1, createdAt: -1 });

module.exports = mongoose.model('CourseAnnouncement', announcementSchema);
