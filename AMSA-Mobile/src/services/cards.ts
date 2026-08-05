// src/services/cards.ts
import { api } from './api';

export interface Card {
  _id: string;
  student: {
    _id: string;
    grade: string;
    user: { name: string; email: string };
  };
  status: 'active' | 'revoked';
  enrolledAt: string;
  lastTapAt?: string;
  revokedAt?: string;
  revokeReason?: string;
}

export const cardsService = {
  async enrollCard(studentId: string): Promise<{ success: boolean; token: string; cardId: string }> {
    const response = await api.post('/cards/enroll', { studentId });
    return response.data;
  },

  async getCardForStudent(studentId: string): Promise<{ success: boolean; card: Card | null }> {
    const response = await api.get(`/cards/student/${studentId}`);
    return response.data;
  },

  async revokeCard(cardId: string, reason?: string): Promise<{ success: boolean; message: string }> {
    const response = await api.patch(`/cards/${cardId}/revoke`, { reason });
    return response.data;
  },

  async listCards(): Promise<{ success: boolean; cards: Card[] }> {
    const response = await api.get('/cards');
    return response.data;
  },
};
