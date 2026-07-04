const mongoose = require('mongoose');

const mentorshipMeetingSchema = new mongoose.Schema(
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
        title: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            trim: true,
        },
        scheduledAt: {
            type: Date,
            required: true,
        },
        status: {
            type: String,
            enum: ['pending', 'approved', 'declined', 'completed'],
            default: 'pending',
        },
        requestedBy: {
            type: String,
            enum: ['student', 'mentor'],
            required: true,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('MentorshipMeeting', mentorshipMeetingSchema);
