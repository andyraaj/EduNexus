const profileService = require('../services/profileService');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');

/**
 * @desc   Get current user's profile (user + role-specific document)
 * @route  GET /api/v1/profile/me
 * @access Private (any authenticated role)
 */
const getMyProfile = asyncHandler(async (req, res) => {
    const result = await profileService.getMyProfile(req.user.id, req.user.role);
    return ApiResponse.success(res, 200, result);
});

/**
 * @desc   Update current user's profile (name + role-specific fields)
 * @route  PUT /api/v1/profile/me
 * @access Private (any authenticated role)
 */
const updateMyProfile = asyncHandler(async (req, res) => {
    const result = await profileService.updateMyProfile(req.user.id, req.user.role, req.body);
    return ApiResponse.success(res, 200, result, 'Profile updated successfully.');
});

/**
 * @desc   Get public profile of any user by ID
 * @route  GET /api/v1/profile/:id
 * @access Private
 */
const getPublicProfile = asyncHandler(async (req, res) => {
    // Determine the role by fetching the user first
    const User = require('../models/User');
    const user = await User.findById(req.params.id);
    if (!user) throw ApiError.notFound('User not found.');
    
    const result = await profileService.getMyProfile(req.params.id, user.role);
    // Hide sensitive stuff from public result
    if (result.user) {
        result.user.email = result.user.email; // we might want to keep it
    }
    return ApiResponse.success(res, 200, result);
});

module.exports = { getMyProfile, updateMyProfile, getPublicProfile };
