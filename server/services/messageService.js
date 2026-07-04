const Message = require('../models/Message');
const User = require('../models/User');
const { getIO } = require('../socketServer');
const { createDirectNotification } = require('./notificationService');

const _bad = (msg) => Object.assign(new Error(msg), { code: 'BAD_REQUEST', status: 400 });

const getConversation = async (userId, otherUserId) => {
    return Message.find({
        $or: [
            { sender: userId, recipient: otherUserId },
            { sender: otherUserId, recipient: userId },
        ]
    })
    .sort({ createdAt: 1 })
    .populate('sender', 'name email role')
    .populate('recipient', 'name email role');
};

/**
 * Returns all conversations for a user, sorted by most recent message (WhatsApp-style).
 * Each entry includes: other user info, last message preview, timestamp, unread count.
 */
const getConversationList = async (userId) => {
    const mongoose = require('mongoose');
    const uid = new mongoose.Types.ObjectId(userId);

    const conversations = await Message.aggregate([
        {
            $match: {
                $or: [{ sender: uid }, { recipient: uid }],
            },
        },
        { $sort: { createdAt: -1 } },
        {
            $addFields: {
                otherUser: {
                    $cond: [{ $eq: ['$sender', uid] }, '$recipient', '$sender'],
                },
                isFromMe: { $eq: ['$sender', uid] },
            },
        },
        {
            $group: {
                _id: '$otherUser',
                lastMessage: { $first: '$content' },
                lastMessageAt: { $first: '$createdAt' },
                lastMessageFromMe: { $first: '$isFromMe' },
                unreadCount: {
                    $sum: {
                        $cond: [
                            { $and: [{ $eq: ['$recipient', uid] }, { $eq: ['$readAt', null] }] },
                            1,
                            0,
                        ],
                    },
                },
            },
        },
        { $sort: { lastMessageAt: -1 } },
        {
            $lookup: {
                from: 'users',
                localField: '_id',
                foreignField: '_id',
                as: 'userInfo',
            },
        },
        { $unwind: '$userInfo' },
        { $match: { 'userInfo.isActive': true } },
        {
            $project: {
                _id: 0,
                userId: '$_id',
                name: '$userInfo.name',
                email: '$userInfo.email',
                role: '$userInfo.role',
                lastMessage: 1,
                lastMessageAt: 1,
                lastMessageFromMe: 1,
                unreadCount: 1,
            },
        },
    ]);

    return conversations;
};

const sendMessage = async (senderId, recipientId, content) => {
    if (!content || !content.trim()) throw _bad('Message content cannot be empty.');

    const recipientUser = await User.findById(recipientId);
    if (!recipientUser) throw _bad('Recipient not found.');

    const senderUser = await User.findById(senderId).select('name');

    const message = await Message.create({
        sender: senderId,
        recipient: recipientId,
        content: content.trim(),
    });

    await message.populate('sender', 'name email role');
    await message.populate('recipient', 'name email role');

    // Emit real-time message and conversation update events via Socket.IO
    try {
        const io = getIO();
        io.to(`user_${recipientId}`).emit('receiveMessage', message);
        // Conversation sidebar update for RECIPIENT (bubble to top, new message preview)
        io.to(`user_${recipientId}`).emit('conversationUpdated', {
            userId: senderId,
            name: senderUser?.name || 'Someone',
            email: recipientUser.email,
            role: (senderUser || {}).role,
            lastMessage: content.trim(),
            lastMessageAt: message.createdAt,
            lastMessageFromMe: false,
            unreadDelta: 1,
        });
        // Conversation sidebar update for SENDER
        io.to(`user_${senderId}`).emit('conversationUpdated', {
            userId: recipientId,
            name: recipientUser.name,
            email: recipientUser.email,
            role: recipientUser.role,
            lastMessage: content.trim(),
            lastMessageAt: message.createdAt,
            lastMessageFromMe: true,
            unreadDelta: 0,
        });
    } catch (err) {
        console.error('Socket.IO emit failed:', err.message);
    }

    // Create in-app notification for the recipient
    try {
        const preview = content.trim().substring(0, 60);
        const ellipsis = content.trim().length > 60 ? '...' : '';
        await createDirectNotification(
            recipientId,
            'message',
            `💬 New message from ${senderUser?.name || 'Someone'}: "${preview}${ellipsis}"`,
            '/messages'
        );
    } catch (err) {
        console.error('Notification creation failed:', err.message);
    }

    return message;
};

const markAsRead = async (userId, messageId) => {
    const message = await Message.findById(messageId);
    if (!message) return null;
    if (message.recipient.toString() !== userId.toString()) return null;
    message.readAt = Date.now();
    await message.save();
    return message;
};

const markConversationRead = async (userId, otherUserId) => {
    return Message.updateMany(
        { sender: otherUserId, recipient: userId, readAt: null },
        { $set: { readAt: new Date() } }
    );
};

const getUnreadCounts = async (userId) => {
    const mongoose = require('mongoose');
    const rows = await Message.aggregate([
        { $match: { recipient: new mongoose.Types.ObjectId(userId), readAt: null } },
        { $group: { _id: '$sender', count: { $sum: 1 } } },
    ]);
    const map = {};
    rows.forEach(r => { map[String(r._id)] = r.count; });
    return map;
};

module.exports = {
    getConversation,
    getConversationList,
    sendMessage,
    markAsRead,
    markConversationRead,
    getUnreadCounts,
};
