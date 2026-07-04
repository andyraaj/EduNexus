const User = require('../models/User');
const Student = require('../models/Student');
const Faculty = require('../models/Faculty');
const ApiError = require('../utils/ApiError');

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Fetch the role-specific profile document populated with user info and department.
 */
const _getProfileByUserId = async (userId, role) => {
    if (role === 'student') {
        return Student.findOne({ user: userId })
            .populate('user', '-password -refreshTokenHash')
            .populate('department', 'name code');
    }
    if (role === 'faculty') {
        return Faculty.findOne({ user: userId })
            .populate('user', '-password -refreshTokenHash')
            .populate('department', 'name code');
    }
    return null;
};

// ── User CRUD ────────────────────────────────────────────────────────────────

/**
 * Get a paginated, filtered list of all users.
 */
const getAllUsers = async ({ role, search, page = 1, limit = 20 }) => {
    const query = {};
    if (role) query.role = role;
    if (search) {
        query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
        ];
    }

    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
        User.find(query)
            .select('-password -refreshTokenHash')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit)),
        User.countDocuments(query),
    ]);

    return {
        users,
        meta: {
            page: Number(page),
            limit: Number(limit),
            totalRecords: total,
            totalPages: Math.ceil(total / limit),
        },
    };
};

/**
 * Get a single user by ID including their role-specific profile.
 */
const getUserById = async (userId) => {
    const user = await User.findById(userId).select('-password -refreshTokenHash');
    if (!user) return null;

    const profile = await _getProfileByUserId(userId, user.role);
    return { user, profile };
};

/**
 * Create a new user and an associated role-specific profile.
 * Admin only action. Department is now an ObjectId.
 */
const createUser = async ({ name, email, password, role, profileData = {} }) => {
    const existing = await User.findOne({ email });
    if (existing) throw ApiError.conflict('A user with this email already exists.');

    const user = await User.create({ name, email, password, role });

    if (role === 'student') {
        await Student.create({
            user: user._id,
            rollNumber: profileData.rollNumber || 'STU' + Date.now(),
            department: profileData.department, // Must be a valid Department ObjectId
            semester: profileData.semester || 1,
            batchYear: profileData.batchYear || new Date().getFullYear(),
        });
    } else if (role === 'faculty') {
        await Faculty.create({
            user: user._id,
            employeeId: profileData.employeeId || 'EMP' + Date.now(),
            department: profileData.department, // Must be a valid Department ObjectId
            designation: profileData.designation || 'Lecturer',
        });
    }

    return { id: user._id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt };
};

/**
 * Update a user's core fields (name, email, role, isActive).
 */
const updateUser = async (userId, updates) => {
    const ALLOWED_FIELDS = ['name', 'email', 'role', 'isActive'];
    const safeUpdates = Object.fromEntries(
        Object.entries(updates).filter(([key]) => ALLOWED_FIELDS.includes(key))
    );

    const user = await User.findByIdAndUpdate(userId, safeUpdates, { new: true, runValidators: true })
        .select('-password -refreshTokenHash');

    if (!user) throw ApiError.notFound('User not found.');
    return user;
};

/**
 * Soft-deactivate a user.
 */
const deactivateUser = async (userId, requestingUserId) => {
    if (String(userId) === String(requestingUserId)) {
        throw ApiError.badRequest('You cannot deactivate your own account.');
    }
    return updateUser(userId, { isActive: false });
};

/**
 * Hard delete a user and their associated profile.
 * TODO: Phase 1C will add cascade hooks for enrollments, submissions, etc.
 */
const deleteUser = async (userId, requestingUserId) => {
    if (String(userId) === String(requestingUserId)) {
        throw ApiError.badRequest('You cannot delete your own account.');
    }

    const user = await User.findById(userId);
    if (!user) throw ApiError.notFound('User not found.');

    // Delete role-specific profile document
    if (user.role === 'student') await Student.deleteOne({ user: userId });
    else if (user.role === 'faculty') await Faculty.deleteOne({ user: userId });

    await User.findByIdAndDelete(userId);
    return { deleted: true };
};

module.exports = {
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    deactivateUser,
    deleteUser,
};
