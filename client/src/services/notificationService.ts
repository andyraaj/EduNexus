import api from './api';
import { Notification } from '@/contexts/SocketContext';

export const fetchNotifications = (token: string): Promise<{ notifications: Notification[] }> =>
    api.get('/notifications', token);

export const markAsRead = (token: string, notificationId: string): Promise<{ notification: Notification }> =>
    api.put(`/notifications/${notificationId}/read`, {}, token);

export const markAllNotificationsRead = (token: string): Promise<{ success: boolean }> =>
    api.put('/notifications/mark-all-read', {}, token);
