const User = require('../models/User');
const Student = require('../models/Student');
const Faculty = require('../models/Faculty');

// ── Profile Service ───────────────────────────────────────────────────────────

/**
 * Get the currently logged-in user's profile.
 * Returns base user info + role-specific profile.
 */
const getMyProfile = async (userId, role) => {
    const user = await User.findById(userId).select('-password -refreshTokenHash');
    if (!user) throw Object.assign(new Error('User not found.'), { code: 'NOT_FOUND', status: 404 });

    let profile = null;
    if (role === 'student') {
        profile = await Student.findOne({ user: userId });
    } else if (role === 'faculty') {
        profile = await Faculty.findOne({ user: userId });
    }

    return { user, profile };
};

/**
 * Update the current user's base profile fields and role-specific details.
 * Students can update: name, phone
 * Faculty can update: name, phone, designation
 * All roles: cannot change email or role through this endpoint.
 */
const updateMyProfile = async (userId, role, updates) => {
    // Allowed base user fields (non-sensitive)
    const BASE_ALLOWED = ['name', 'bio', 'pronouns', 'skills', 'bannerGradient', 'accentColor', 'socials'];
    const baseUpdates = Object.fromEntries(
        Object.entries(updates).filter(([key]) => BASE_ALLOWED.includes(key))
    );

    // Update base User document if any allowed fields present
    if (Object.keys(baseUpdates).length > 0) {
        await User.findByIdAndUpdate(userId, baseUpdates, { runValidators: true });
    }

    // Update role-specific profile fields
    if (role === 'student') {
        const STUDENT_ALLOWED = ['department', 'semester', 'phone', 'address', 'bio'];
        const studentUpdates = Object.fromEntries(
            Object.entries(updates).filter(([key]) => STUDENT_ALLOWED.includes(key))
        );
        if (Object.keys(studentUpdates).length > 0) {
            await Student.findOneAndUpdate(
                { user: userId },
                studentUpdates,
                { new: true, runValidators: true }
            );
        }
    } else if (role === 'faculty') {
        const FACULTY_ALLOWED = ['designation', 'department', 'phone', 'bio', 'specializations'];
        const facultyUpdates = Object.fromEntries(
            Object.entries(updates).filter(([key]) => FACULTY_ALLOWED.includes(key))
        );
        if (Object.keys(facultyUpdates).length > 0) {
            await Faculty.findOneAndUpdate(
                { user: userId },
                facultyUpdates,
                { new: true, runValidators: true }
            );
        }
    }

    // Return refreshed combined profile
    return getMyProfile(userId, role);
};

module.exports = { getMyProfile, updateMyProfile };
