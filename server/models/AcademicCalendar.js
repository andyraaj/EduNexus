const mongoose = require('mongoose');

const academicCalendarSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true
        },
        academicYear: {
            type: String,
            required: true,
            trim: true
        },
        calendarType: {
            type: String,
            enum: ['academic', 'holiday', 'exam'],
            default: 'academic'
        },
        // Cloudinary HTTPS URL — permanent, CDN-served
        fileUrl: {
            type: String,
            required: true
        },
        // Cloudinary public_id — needed to delete the asset
        cloudinaryPublicId: {
            type: String,
            default: null
        },
        // Cloudinary resource type: 'image' | 'raw' | 'video'
        cloudinaryResourceType: {
            type: String,
            default: 'raw'
        },
        fileName: {
            type: String,
            default: 'calendar.pdf'
        },
        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model('AcademicCalendar', academicCalendarSchema);
