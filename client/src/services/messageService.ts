import api from './api';

export interface ConversationEntry {
    userId: string;
    name: string;
    email: string;
    role: string;
    lastMessage: string;
    lastMessageAt: string;
    lastMessageFromMe: boolean;
    unreadCount: number;
}

export const getConversationList = (token: string): Promise<{ conversations: ConversationEntry[] }> =>
    api.get('/messages/conversations', token);

export const getConversation = (token: string, userId: string): Promise<{ messages: any[] }> =>
    api.get(`/messages/${userId}`, token);

export const sendMessage = (token: string, recipientId: string, content: string): Promise<{ message: any }> =>
    api.post('/messages', { recipientId, content }, token);

export const getUnreadCounts = (token: string): Promise<{ counts: Record<string, number> }> =>
    api.get('/messages/unread/counts', token);

export const markConversationRead = (token: string, userId: string): Promise<{ updated: number }> =>
    api.put(`/messages/conversation/${userId}/read`, {}, token);

export const markMessageRead = (token: string, id: string): Promise<{ message: any }> =>
    api.put(`/messages/${id}/read`, {}, token);
