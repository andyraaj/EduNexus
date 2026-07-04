const mongoose = require('mongoose');

const admissionDocumentSchema = new mongoose.Schema(
    {
        label: {
            type: String,
            trim: true,
            required: true,
        },
        url: {
            type: String,
            trim: true,
            default: '',
        },
        status: {
            type: String,
            enum: ['pending', 'received', 'verified', 'rejected'],
            default: 'pending',
        },
        remarks: {
            type: String,
            trim: true,
            default: '',
        },
    },
    { _id: false }
);

const admissionApplicationSchema = new mongoose.Schema(
    {
        applicantName: {
            type: String,
            required: true,
            trim: true,
        },
        email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
        },
        phone: {
            type: String,
            required: true,
            trim: true,
        },
        program: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Program',
            required: true,
        },
        academicYear: {
            type: String,
            required: true,
            trim: true,
        },
        status: {
            type: String,
            enum: ['inquiry', 'application', 'document_verification', 'offer', 'enrolled', 'rejected', 'withdrawn'],
            default: 'inquiry',
        },
        source: {
            type: String,
            trim: true,
            default: 'direct',
        },
        documents: {
            type: [admissionDocumentSchema],
            default: [],
        },
        notes: {
            type: String,
            trim: true,
            default: '',
        },
        reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        decidedAt: {
            type: Date,
            default: null,
        },
        convertedUser: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        convertedStudent: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Student',
            default: null,
        },
        convertedAt: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true }
);

admissionApplicationSchema.index({ status: 1, createdAt: -1 });
admissionApplicationSchema.index({ email: 1, program: 1, academicYear: 1 });

module.exports = mongoose.model('AdmissionApplication', admissionApplicationSchema);
