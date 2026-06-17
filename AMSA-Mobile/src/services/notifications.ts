import { api } from './api';

export interface AppNotification {
  _id: string;
  title: string;
  message: string;
  type: 'class_reminder' | 'check_in_available' | 'announcement' | 'attendance_alert' | 'general' | 'weekly_report';
  read: boolean;
  readAt?: string;
  priority: 'low' | 'normal' | 'high';
  createdAt: string;
  data?: Record<string, string>;
}

export interface NotificationsResponse {
  notifications: AppNotification[];
  pagination: { page: number; limit: number; total: number; pages: number };
  unreadCount: number;
}

export const getNotifications = async (
  page = 1,
  unreadOnly = false
): Promise<NotificationsResponse> => {
  const res = await api.get('/notifications', { params: { page, limit: 20, unreadOnly } });
  return res.data;
};

export const markNotificationAsRead = async (id: string): Promise<void> => {
  await api.patch(`/notifications/${id}/read`);
};

export const markAllNotificationsAsRead = async (): Promise<void> => {
  await api.patch('/notifications/read-all');
};
