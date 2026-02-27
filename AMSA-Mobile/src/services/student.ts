// src/services/student.ts
import { api } from './api';

export interface Note {
  _id: string;
  title: string;
  description: string;
  subject: string;
  grade: string;
  fileUrl?: string;
  tutor: {
    _id: string;
    user: {
      name: string;
    };
  };
  createdAt: string;
}

export interface Mark {
  _id: string;
  subject: string;
  testName: string;
  score: number;
  total: number;
  grade: string;
  date: string;
  createdAt: string;
}

export interface Attendance {
  _id: string;
  status: 'present' | 'absent' | 'late' | 'excused' | 'left_early';
  class: {
    _id: string;
    title: string;
    subject: string;
    scheduledDate: string;
    startTime?: string;
  };
  checkIn?: {
    time: string;
    deviceId?: string;
  };
  notes?: string;
  createdAt: string;
}

export interface StudentProfile {
  _id: string;
  grade: string;
  subjects: string[];
  user: {
    _id: string;
    name: string;
    email: string;
  };
}

export interface ClassSchedule {
  _id: string;
  subject: string;
  title: string;
  description: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  room: string;
  meetingLink?: string;
  tutor?: {
    _id: string;
    user?: {
      name: string;
      email?: string;
    };
  };
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  students?: string[];
  checkInStart?: string;
  checkInEnd?: string;
  checkOutStart?: string;
  checkOutEnd?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpcomingClassesResponse {
  upcomingClasses: ClassSchedule[];
}

export interface ScheduleFilters {
  startDate?: string;
  endDate?: string;
  subject?: string;
  tutorId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface ScheduleResponse {
  schedules: ClassSchedule[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export const studentService = {
  async getProfile(): Promise<{ student: StudentProfile }> {
    const response = await api.get('/students/me');
    return response.data;
  },

  async getNotes(): Promise<{ notes: Note[] }> {
    const response = await api.get('/students/notes');
    return response.data;
  },

  async getMarks(): Promise<{ marks: Mark[] }> {
    const response = await api.get('/students/marks');
    return response.data;
  },

  async getAttendance(): Promise<{ attendance: Attendance[] }> {
    const response = await api.get('/attendance/my-attendance');
    return { attendance: response.data.history || [] };
  },

  async getUpcomingClasses(): Promise<UpcomingClassesResponse> {
    const response = await api.get('/schedules/upcoming');
    return response.data;
  },

  async getSchedule(filters?: ScheduleFilters): Promise<ScheduleResponse> {
    const response = await api.get('/schedules', { params: filters });
    return response.data;
  },

  async getTodaySchedule(): Promise<{ schedules: ClassSchedule[] }> {
    const today = new Date().toISOString().split('T')[0];
    const response = await api.get('/schedules', {
      params: {
        startDate: today,
        endDate: today,
        status: 'scheduled'
      }
    });
    return response.data;
  },

  async getWeekSchedule(): Promise<ScheduleResponse> {
    const today = new Date();
    const weekFromNow = new Date();
    weekFromNow.setDate(today.getDate() + 7);
    
    const response = await api.get('/schedules', {
      params: {
        startDate: today.toISOString().split('T')[0],
        endDate: weekFromNow.toISOString().split('T')[0],
        status: 'scheduled'
      }
    });
    return response.data;
  },

  async getClassDetails(classId: string): Promise<{ class: ClassSchedule }> {
    const response = await api.get(`/schedules/${classId}`);
    return response.data;
  },

  async checkIn(classId: string, deviceId: string, location?: LocationData): Promise<{ message: string; attendance: any }> {
    const response = await api.post(`/attendance/classes/${classId}/check-in`, { 
      deviceId,
      location 
    });
    return response.data;
  },

  async checkOut(classId: string): Promise<{ message: string; attendance: any }> {
    const response = await api.post(`/attendance/classes/${classId}/check-out`, {});
    return response.data;
  },

  async getClassAttendance(classId: string): Promise<{ attendance: any[] }> {
    const response = await api.get(`/attendance/classes/${classId}/attendance`);
    return response.data;
  },

  async getMyAttendanceForClass(classId: string): Promise<{ attendance: any }> {
    const response = await api.get(`/attendance/classes/${classId}/me`);
    return response.data;
  },

  async updatePushToken(pushToken: string): Promise<{ success: boolean; message: string }> {
    const response = await api.put('/auth/push-token', { pushToken });
    return response.data;
  },

  async changePassword(data: { currentPassword: string; newPassword: string }): Promise<{ message: string }> {
    const response = await api.post('/auth/change-password', data);
    return response.data;
  }
};