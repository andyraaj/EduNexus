const mongoose = require('mongoose');

const institutionSettingsSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            default: 'EduNexus College',
            trim: true,
        },
        code: {
            type: String,
            default: 'ACX',
            uppercase: true,
            trim: true,
        },
        logoUrl: {
            type: String,
            default: '',
            trim: true,
        },
        website: {
            type: String,
            default: '',
            trim: true,
        },
        contactEmail: {
            type: String,
            default: '',
            trim: true,
            lowercase: true,
        },
        contactPhone: {
            type: String,
            default: '',
            trim: true,
        },
        address: {
            type: String,
            default: '',
            trim: true,
        },
        activeAcademicYear: {
            type: String,
            default: '2025-2026',
            trim: true,
        },
        attendanceThreshold: {
            type: Number,
            default: 75,
            min: 0,
            max: 100,
        },
        defaultCurrency: {
            type: String,
            default: 'INR',
            uppercase: true,
            trim: true,
        },
        gradingScheme: {
            type: String,
            enum: ['marks', 'gpa', 'cgpa'],
            default: 'marks',
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('InstitutionSettings', institutionSettingsSchema);
