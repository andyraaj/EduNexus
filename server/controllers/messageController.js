const messageService = require('../services/messageService');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');

const sendMessage = asyncHandler(async (req, res) => {
    const { recipientId, content } = req.body;
    if (!recipientId || !content) {
        throw ApiError.badRequest('recipientId and content are required.');
    }
    const message = await messageService.sendMessage(req.user.id, recipientId, content);
    return ApiResponse.success(res, 201, { message }, 'Message sent.');
});

const getConversation = asyncHandler(async (req, res) => {
    const messages = await messageService.getConversation(req.user.id, req.params.userId);
    return ApiResponse.success(res, 200, { messages });
});

const getConversationList = asyncHandler(async (req, res) => {
    const conversations = await messageService.getConversationList(req.user.id);
    return ApiResponse.success(res, 200, { conversations });
});

const markMessageRead = asyncHandler(async (req, res) => {
    const message = await messageService.markAsRead(req.user.id, req.params.id);
    return ApiResponse.success(res, 200, { message }, 'Message marked as read.');
});

const markConversationRead = asyncHandler(async (req, res) => {
    const result = await messageService.markConversationRead(req.user.id, req.params.userId);
    return ApiResponse.success(res, 200, { updated: result.modifiedCount ?? result.nModified ?? 0 }, 'Conversation marked as read.');
});

const getUnreadCounts = asyncHandler(async (req, res) => {
    const counts = await messageService.getUnreadCounts(req.user.id);
    return ApiResponse.success(res, 200, { counts });
});

module.exports = { sendMessage, getConversation, getConversationList, markMessageRead, markConversationRead, getUnreadCounts };
