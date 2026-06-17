import { api } from './api';

export interface ConversationParticipant {
  _id: string;
  name: string;
  email: string;
}

export interface Conversation {
  _id: string;
  admin:          ConversationParticipant;
  parent:         ConversationParticipant;
  lastMessage:    string;
  lastMessageAt:  string;
  unreadByAdmin:  number;
  unreadByParent: number;
  createdAt:      string;
}

export interface Message {
  _id:        string;
  sender:     { _id: string; name: string; role: string };
  senderRole: 'admin' | 'parent';
  content:    string;
  read:       boolean;
  createdAt:  string;
}

export const messageService = {
  async getConversations(): Promise<{ conversations: Conversation[] }> {
    const res = await api.get('/messages');
    return res.data;
  },

  async getMessages(conversationId: string): Promise<{ messages: Message[] }> {
    const res = await api.get(`/messages/${conversationId}`);
    return res.data;
  },

  async sendMessage(conversationId: string, content: string): Promise<{ message: Message }> {
    const res = await api.post(`/messages/${conversationId}`, { content });
    return res.data;
  },

  async markRead(conversationId: string): Promise<void> {
    await api.patch(`/messages/${conversationId}/read`);
  },
};
