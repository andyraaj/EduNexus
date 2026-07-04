const userService = require('../services/userService');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');

// ── Controllers ───────────────────────────────────────────────────────────────

/**
 * @desc   Get all users with search, filter, pagination
 * @route  GET /api/v1/users
 * @access Admin, Faculty
 */
const getAllUsers = asyncHandler(async (req, res) => {
    const { role, search, page = 1, limit = 20 } = req.query;
    const result = await userService.getAllUsers({ role, search, page, limit });
    return ApiResponse.success(res, 200, { users: result.users }, 'Users fetched.', result.meta);
});

/**
 * @desc   Get single user with their profile
 * @route  GET /api/v1/users/:id
 * @access Admin
 */
const getUserById = asyncHandler(async (req, res) => {
    const result = await userService.getUserById(req.params.id);
    if (!result) throw ApiError.notFound('User not found.');
    return ApiResponse.success(res, 200, result);
});

/**
 * @desc   Create a new user (and role profile)
 * @route  POST /api/v1/users
 * @access Admin
 */
const createUser = asyncHandler(async (req, res) => {
    const { name, email, password, role, ...profileData } = req.body;
    if (!name || !email || !password || !role) {
        throw ApiError.badRequest('name, email, password, and role are required.');
    }
    const user = await userService.createUser({ name, email, password, role, profileData });
    return ApiResponse.success(res, 201, user, 'User created successfully.');
});

/**
 * @desc   Update user fields (name, email, role, isActive)
 * @route  PUT /api/v1/users/:id
 * @access Admin
 */
const updateUser = asyncHandler(async (req, res) => {
    const updated = await userService.updateUser(req.params.id, req.body);
    return ApiResponse.success(res, 200, updated, 'User updated successfully.');
});

/**
 * @desc   Hard delete a user and their profile
 * @route  DELETE /api/v1/users/:id
 * @access Admin
 */
const deleteUser = asyncHandler(async (req, res) => {
    await userService.deleteUser(req.params.id, req.user.id);
    return ApiResponse.success(res, 200, null, 'User deleted successfully.');
});

/**
 * @desc   Soft-deactivate a user (isActive: false)
 * @route  PUT /api/v1/users/:id/deactivate
 * @access Admin
 */
const deactivateUser = asyncHandler(async (req, res) => {
    const updated = await userService.deactivateUser(req.params.id, req.user.id);
    return ApiResponse.success(res, 200, updated, 'User deactivated.');
});

module.exports = { getAllUsers, getUserById, createUser, updateUser, deleteUser, deactivateUser };
