// src/services/academic.ts
import { api } from './api';

export interface AcademicConfig {
  subjects: string[];
  grades: string[];
  subjectCount: number;
  gradeCount: number;
}

export const academicService = {
  async getConfig(): Promise<AcademicConfig> {
    const response = await api.get('/academic/config');
    return response.data;
  },

  async getSubjects(): Promise<{ subjects: string[]; count: number }> {
    const response = await api.get('/academic/subjects');
    return response.data;
  },

  async getGrades(): Promise<{ grades: string[]; count: number }> {
    const response = await api.get('/academic/grades');
    return response.data;
  },
};