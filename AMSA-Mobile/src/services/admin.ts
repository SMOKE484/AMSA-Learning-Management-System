// src/services/admin.ts
import { api } from './api';

export interface AdminStudent {
  _id: string;
  grade: string;
  subjects: string[];
  photoUrl?: string | null;
  parents?: string[];
  user: { _id: string; name: string; email: string } | null;
}

export interface AdminTutor {
  _id: string;
  subjects: string[];
  grades: (string | number)[];
  user: { _id: string; name: string; email: string };
}

export interface AdminParent {
  _id: string;
  name: string;
  email: string;
  linkedStudents?: AdminStudent[];
}

export interface AdminUser {
  _id: string;
  name: string;
  email: string;
  role: string;
}

export interface AdminMark {
  _id: string;
  student: { _id: string; user: { name: string; email: string } };
  tutor?: { _id: string };
  subject: string;
  testName: string;
  score: number;
  total: number;
  grade: string;
  date: string;
  createdAt: string;
}

export interface Subject {
  _id: string;
  name: string;
  isActive: boolean;
}

export interface SchoolConfig {
  name: string;
  coordinates: { lat: number; lng: number };
  allowedRadius: number;
  geoFencingEnabled: boolean;
  requireLocationAccuracy: boolean;
  maxLocationAccuracy: number;
  geofencePolygon: { lat: number; lng: number }[];
  address: Record<string, string>;
  defaultCheckInBuffer: number;
  defaultCheckOutBuffer: number;
  autoMarkAbsentEnabled: boolean;
  nfcLateGraceMinutes: number;
}

export const adminService = {
  // Students
  async getStudents(): Promise<{ students: AdminStudent[] }> {
    const response = await api.get('/admin/students');
    return response.data;
  },
  async createStudent(data: { name: string; email: string; password: string; grade: string; subjects: string[]; parentIds?: string[] }) {
    const response = await api.post('/admin/students', data);
    return response.data;
  },
  async updateStudent(userId: string, data: { name?: string; email?: string; grade?: string; subjects?: string[] }) {
    const response = await api.put(`/admin/students/${userId}`, data);
    return response.data;
  },
  async uploadStudentPhoto(studentId: string, fileUri: string): Promise<{ photoUrl: string }> {
    const form = new FormData();
    form.append('file', { uri: fileUri, name: 'photo.jpg', type: 'image/jpeg' } as any);
    const response = await api.post(`/admin/students/${studentId}/photo`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  // Tutors
  async getTutors(): Promise<{ tutors: AdminTutor[] }> {
    const response = await api.get('/admin/tutors');
    return response.data;
  },
  async createTutor(data: { name: string; email: string; password: string; subjects: string[]; grades: string[] }) {
    const response = await api.post('/admin/tutors', data);
    return response.data;
  },

  // Parents
  async getParents(): Promise<{ parents: AdminParent[] }> {
    const response = await api.get('/admin/parents');
    return response.data;
  },
  async getParentWithStudents(parentId: string): Promise<{ parent: AdminParent }> {
    const response = await api.get(`/admin/parents/${parentId}`);
    return response.data;
  },
  async createParent(data: { name: string; email: string; password: string }) {
    const response = await api.post('/admin/parents', data);
    return response.data;
  },
  async updateParent(userId: string, data: { name?: string; email?: string }) {
    const response = await api.put(`/admin/parents/${userId}`, data);
    return response.data;
  },
  async linkParentToStudent(studentId: string, parentId: string) {
    const response = await api.post(`/admin/students/${studentId}/link-parent`, { parentId });
    return response.data;
  },

  // Delete any user (student/tutor/parent/admin/staff)
  async deleteUser(userId: string) {
    const response = await api.delete(`/admin/users/${userId}`);
    return response.data;
  },

  // Admins
  async getAdmins(): Promise<{ admins: AdminUser[] }> {
    const response = await api.get('/admin/admins');
    return response.data;
  },
  async createAdmin(data: { name: string; email: string; password: string }) {
    const response = await api.post('/admin/admins', data);
    return response.data;
  },
  async updateAdmin(userId: string, data: { name?: string; email?: string }) {
    const response = await api.put(`/admin/admins/${userId}`, data);
    return response.data;
  },

  // Attendance staff
  async getStaff(): Promise<{ staff: AdminUser[] }> {
    const response = await api.get('/admin/staff');
    return response.data;
  },
  async createStaff(data: { name: string; email: string; password: string }) {
    const response = await api.post('/admin/staff', data);
    return response.data;
  },
  async updateStaff(userId: string, data: { name?: string; email?: string }) {
    const response = await api.put(`/admin/staff/${userId}`, data);
    return response.data;
  },

  // Marks
  async getAllMarks(params?: { grade?: string; subject?: string; studentId?: string }): Promise<{ meta: { count: number; averageScore: string }; marks: AdminMark[] }> {
    const response = await api.get('/admin/marks', { params });
    return response.data;
  },
  async updateMark(markId: string, data: { score?: number; total?: number }) {
    const response = await api.put(`/admin/marks/${markId}`, data);
    return response.data;
  },
  async deleteMark(markId: string) {
    const response = await api.delete(`/admin/marks/${markId}`);
    return response.data;
  },

  // Subjects
  async getSubjects(): Promise<{ subjects: Subject[] }> {
    const response = await api.get('/admin/subjects');
    return response.data;
  },
  async createSubject(name: string) {
    const response = await api.post('/admin/subjects', { name });
    return response.data;
  },
  async updateSubject(subjectId: string, data: { name?: string; isActive?: boolean }) {
    const response = await api.put(`/admin/subjects/${subjectId}`, data);
    return response.data;
  },
  async deleteSubject(subjectId: string) {
    const response = await api.delete(`/admin/subjects/${subjectId}`);
    return response.data;
  },

  // School config
  async getSchoolConfig(): Promise<{ school: SchoolConfig }> {
    const response = await api.get('/school-config');
    return response.data;
  },
  async updateSchoolConfig(data: Partial<SchoolConfig>) {
    const response = await api.put('/admin/school-config', data);
    return response.data;
  },

  // Schedules
  async getSchedules(params?: Record<string, any>): Promise<{ schedules: any[]; pagination: any }> {
    const response = await api.get('/schedules', { params });
    return response.data;
  },
  async createSchedule(data: Record<string, any>) {
    const response = await api.post('/schedules', data);
    return response.data;
  },
  async updateSchedule(id: string, data: Record<string, any>) {
    const response = await api.put(`/schedules/${id}`, data);
    return response.data;
  },
  async deleteSchedule(id: string) {
    const response = await api.delete(`/schedules/${id}`);
    return response.data;
  },

  // Announcements
  async postAnnouncement(data: { title: string; message: string; target: 'students' | 'parents' | 'both'; priority?: string; grades?: string[] }) {
    const response = await api.post('/notifications/announcement', data);
    return response.data;
  },
};
