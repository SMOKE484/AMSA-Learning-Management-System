// src/services/attendanceAdmin.ts
import { api } from './api';
import { toLocalDateString } from '../utils/formatting';

export interface TapAttendanceResult {
  success: boolean;
  alreadyMarked: boolean;
  student: { name: string; photoUrl: string | null; grade: string };
  class: { title: string; subject: string; startTime: string };
  status: 'present' | 'late';
  checkInTime: string;
}

export interface TapAmbiguousClass {
  _id: string;
  title: string;
  subject: string;
  startTime: string;
}

export interface TodayScheduleEntry {
  _id: string;
  title: string;
  subject: string;
  grade: string;
  startTime: string;
  endTime: string;
}

export const attendanceAdminService = {
  async tapAttendance(cardToken: string, classId?: string): Promise<TapAttendanceResult> {
    const response = await api.post('/attendance/nfc-tap', { cardToken, classId });
    return response.data;
  },

  async getTodaySchedules(): Promise<{ schedules: TodayScheduleEntry[] }> {
    const today = toLocalDateString(new Date());
    const response = await api.get('/schedules', {
      params: { startDate: today, endDate: today },
    });
    return response.data;
  },

  async getAllAttendance(params?: { classId?: string; startDate?: string; endDate?: string }): Promise<any[]> {
    const response = await api.get('/attendance/admin/all', { params });
    return response.data;
  },

  async markBatch(classId: string, students: { studentId: string; status: string }[]): Promise<any> {
    const response = await api.post(`/attendance/classes/${classId}/mark-batch`, { students });
    return response.data;
  },
};
