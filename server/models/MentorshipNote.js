const mongoose = require('mongoose');

const mentorshipNoteSchema = new mongoose.Schema(
    {
        mentor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        note: {
            type: String,
            required: true,
            trim: true,
        },
        gpa: {
            type: Number,
            default: 0,
        },
        attendanceRate: {
            type: Number,
            default: 0,
        },
        backlogsCount: {
            type: Number,
            default: 0,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('MentorshipNote', mentorshipNoteSchema);
