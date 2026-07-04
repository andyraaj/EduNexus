const notificationService = require('../services/notificationService');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');

const getNotifications = asyncHandler(async (req, res) => {
    const notifications = await notificationService.getNotifications(req.user.id);
    return ApiResponse.success(res, 200, { notifications });
});

const markNotificationRead = asyncHandler(async (req, res) => {
    const notification = await notificationService.markNotificationRead(req.user.id, req.params.id);
    return ApiResponse.success(res, 200, { notification }, 'Notification marked as read.');
});

const markAllNotificationsRead = asyncHandler(async (req, res) => {
    await notificationService.markAllRead(req.user.id);
    return ApiResponse.success(res, 200, {}, 'All notifications marked as read.');
});

module.exports = { getNotifications, markNotificationRead, markAllNotificationsRead };
