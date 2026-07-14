const { getAllowedOrigins, isAllowedOrigin, getVercelProjectName } = require('./config/env');
const Course = require('./models/Course');
const Enrollment = require('./models/Enrollment');

let io;

const jwt = require('jsonwebtoken');
let Server;

try {
    ({ Server } = require('socket.io'));
} catch (err) {
    console.warn('[Socket.IO] Disabled at startup:', err.message);
}

const initSocket = (server) => {
    if (!Server) {
        return null;
    }

    const allowedOrigins = getAllowedOrigins();
    console.log('[Socket.IO CORS] Allowed origins:', allowedOrigins);
    console.log('[Socket.IO CORS] Vercel project name pattern:', getVercelProjectName());

    io = new Server(server, {
        cors: {
            origin: function (origin, callback) {
                // Allow requests with no origin (same-origin, server-to-server)
                if (!origin) return callback(null, true);

                if (isAllowedOrigin(origin)) {
                    return callback(null, true);
                }

                console.error('[Socket.IO CORS] Blocked origin:', origin);
                return callback(new Error(`Origin not allowed by CORS: ${origin}`));
            },
            methods: ['GET', 'POST'],
            credentials: true,
        },
    });

    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) {
            return next(new Error('Authentication error: Token missing'));
        }
        try {
            if (!process.env.JWT_SECRET) {
                return next(new Error('Authentication error: Server auth is not configured'));
            }
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.user = decoded;
            next();
        } catch (err) {
            return next(new Error('Authentication error: Invalid token'));
        }
    });

    io.on('connection', (socket) => {
        if (process.env.NODE_ENV !== 'test') {
            console.log(`[Socket.IO] New client connected: ${socket.id}`);
        }

        socket.on('connectUser', () => {
            const userId = socket.user?.id;
            if (!userId) return;
            socket.join(`user_${userId}`);

            // Join role-based room so admins/faculty/students get role-targeted events
            if (socket.user.role) {
                socket.join(`role_${socket.user.role}`);
            }
        });

        socket.on('joinCourse', async (courseId) => {
            if (!courseId || !socket.user?.id) return;
            const isAllowed = await canJoinCourseRoom(socket.user, courseId);
            if (isAllowed) socket.join(`course_${courseId}`);
        });

        // Faculty joins a QR session room to receive real-time scan updates
        socket.on('joinQRSession', async (sessionId) => {
            if (!sessionId || !socket.user?.id) return;
            if (socket.user.role === 'faculty' || socket.user.role === 'admin') {
                socket.join(`qr_session_${sessionId}`);
            }
        });

        socket.on('leaveQRSession', (sessionId) => {
            if (sessionId) socket.leave(`qr_session_${sessionId}`);
        });

        // Typing indicator for 1:1 chats
        socket.on('typing', ({ toUserId, fromUserId }) => {
            if (!toUserId || !fromUserId) return;
            io.to(`user_${toUserId}`).emit('typing', { fromUserId });
        });

        socket.on('stopTyping', ({ toUserId, fromUserId }) => {
            if (!toUserId || !fromUserId) return;
            io.to(`user_${toUserId}`).emit('stopTyping', { fromUserId });
        });

        socket.on('disconnect', () => {});
    });

    return io;
};

/**
 * Check if a user is allowed to join a course's socket room.
 * Since all refs are now User._id, no need to look up Faculty profile.
 */
const canJoinCourseRoom = async (user, courseId) => {
    if (user.role === 'admin') return true;

    if (user.role === 'student') {
        return Boolean(await Enrollment.exists({ student: user.id, course: courseId, status: 'enrolled' }));
    }

    if (user.role === 'faculty') {
        // primaryFaculty now stores User._id directly — no Faculty lookup needed
        return Boolean(await Course.exists({ _id: courseId, primaryFaculty: user.id, isActive: true }));
    }

    return false;
};

const getIO = () => {
    if (!io) {
        throw new Error('Socket.IO is not initialized!');
    }
    return io;
};

module.exports = { initSocket, getIO };
