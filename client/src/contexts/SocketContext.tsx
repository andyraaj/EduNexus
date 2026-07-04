import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { getUnreadCounts } from '@/services/messageService';
import { API_BASE_URL } from '@/services/api';
import { fetchMyCoursesFaculty, fetchMyEnrollments } from '@/services/courseService';

export interface Notification {
    _id: string;
    type: string;
    message: string;
    linkAction: string;
    isRead: boolean;
    createdAt: string;
}

export interface Message {
    _id: string;
    sender: any;
    recipient: any;
    content: string;
    readAt: string | null;
    createdAt: string;
}

export interface ConversationUpdate {
    userId: string;
    name: string;
    email: string;
    role: string;
    lastMessage: string;
    lastMessageAt: string;
    lastMessageFromMe: boolean;
    unreadDelta: number;
}

export interface MessageToast {
    id: string;
    senderName: string;
    senderId: string;
    content: string;
    timestamp: string;
}

interface SocketContextData {
    socket: Socket | null;
    notifications: Notification[];
    unreadCount: number;
    setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
    unreadMessagesByUser: Record<string, number>;
    typingByUser: Record<string, boolean>;
    setUnreadMessagesByUser: React.Dispatch<React.SetStateAction<Record<string, number>>>;
    conversationUpdates: ConversationUpdate[];
    messageToasts: MessageToast[];
    dismissToast: (id: string) => void;
}

const SocketContext = createContext<SocketContextData>({
    socket: null,
    notifications: [],
    unreadCount: 0,
    setNotifications: () => {},
    unreadMessagesByUser: {},
    typingByUser: {},
    setUnreadMessagesByUser: () => {},
    conversationUpdates: [],
    messageToasts: [],
    dismissToast: () => {},
});

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, accessToken } = useAuth();
    const [socket, setSocket] = useState<Socket | null>(null);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadMessagesByUser, setUnreadMessagesByUser] = useState<Record<string, number>>({});
    const [typingByUser, setTypingByUser] = useState<Record<string, boolean>>({});
    const [conversationUpdates, setConversationUpdates] = useState<ConversationUpdate[]>([]);
    const [messageToasts, setMessageToasts] = useState<MessageToast[]>([]);

    const dismissToast = useCallback((id: string) => {
        setMessageToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    useEffect(() => {
        if (!user || !accessToken) {
            if (socket) {
                socket.disconnect();
                setSocket(null);
            }
            return;
        }

        const newSocket = io(API_BASE_URL.replace('/api/v1', ''), {
            withCredentials: true,
            auth: { token: accessToken }
        });

        newSocket.on('connect', () => {
            newSocket.emit('connectUser', user.id);

            if (user.role === 'student') {
                fetchMyEnrollments(accessToken)
                    .then(res => {
                        res.enrollments.forEach(e => {
                            if (e.course?._id) newSocket.emit('joinCourse', e.course._id);
                        });
                    })
                    .catch(() => {});
            } else if (user.role === 'faculty') {
                fetchMyCoursesFaculty(accessToken)
                    .then(res => {
                        res.courses.forEach(c => newSocket.emit('joinCourse', c._id));
                    })
                    .catch(() => {});
            }
        });

        newSocket.on('newNotification', (notif: Notification) => {
            setNotifications(prev => [notif, ...prev]);
        });

        newSocket.on('new_announcement', (announcement: any) => {
            const notif: Notification = {
                _id: 'ann_' + Date.now(),
                type: 'announcement',
                message: `New Announcement: ${announcement.title}`,
                linkAction: '/student/dashboard',
                isRead: false,
                createdAt: new Date().toISOString()
            };
            setNotifications(prev => [notif, ...prev]);
        });

        newSocket.on('courses_changed', (payload: any) => {
            window.dispatchEvent(new CustomEvent('EduNexus:courses_changed', { detail: payload }));
        });

        newSocket.on('receiveMessage', (msg: Message) => {
            const senderId = typeof msg.sender === 'string' ? msg.sender : msg.sender?._id;
            const recipientId = typeof msg.recipient === 'string' ? msg.recipient : msg.recipient?._id;
            const senderName = typeof msg.sender === 'object' ? msg.sender?.name : 'Someone';

            if (recipientId && user?.id && recipientId === user.id && senderId) {
                // Update unread badge count
                setUnreadMessagesByUser(prev => ({
                    ...prev,
                    [senderId]: (prev[senderId] || 0) + 1,
                }));

                // Show toast notification
                const toastId = `toast_${Date.now()}_${Math.random()}`;
                const toast: MessageToast = {
                    id: toastId,
                    senderName: senderName || 'Someone',
                    senderId,
                    content: msg.content,
                    timestamp: msg.createdAt,
                };
                setMessageToasts(prev => [toast, ...prev.slice(0, 2)]); // max 3 toasts
                // Auto-dismiss after 5 seconds
                setTimeout(() => dismissToast(toastId), 5000);
            }
        });

        // Handle real-time conversation list updates (bubble to top)
        newSocket.on('conversationUpdated', (update: ConversationUpdate) => {
            setConversationUpdates(prev => {
                const existing = prev.filter(c => String(c.userId) !== String(update.userId));
                return [update, ...existing];
            });
        });

        newSocket.on('typing', ({ fromUserId }: { fromUserId: string }) => {
            if (!fromUserId) return;
            setTypingByUser(prev => ({ ...prev, [fromUserId]: true }));
        });
        newSocket.on('stopTyping', ({ fromUserId }: { fromUserId: string }) => {
            if (!fromUserId) return;
            setTypingByUser(prev => ({ ...prev, [fromUserId]: false }));
        });

        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
        };
    }, [user, accessToken]);

    // Initial unread counts from DB
    useEffect(() => {
        if (!accessToken || !user) return;
        getUnreadCounts(accessToken)
            .then(res => setUnreadMessagesByUser(res.counts || {}))
            .catch(() => {});
    }, [accessToken, user?.id]);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    return (
        <SocketContext.Provider value={{
            socket,
            notifications,
            unreadCount,
            setNotifications,
            unreadMessagesByUser,
            typingByUser,
            setUnreadMessagesByUser,
            conversationUpdates,
            messageToasts,
            dismissToast,
        }}>
            {children}
        </SocketContext.Provider>
    );
};

export const useSocket = () => useContext(SocketContext);
