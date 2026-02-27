// src/services/parent.ts
import { api } from './api';

export interface Child {
  _id: string;
  user: {
    _id: string;
    name: string;
    email: string;
  };
  grade: string;
  subjects: string[];
}

export interface ChildMark {
  _id: string;
  student: {
    _id: string;
    user: {
      name: string;
      email: string;
    };
  };
  subject: string;
  testName: string;
  score: number;
  total: number;
  grade: string;
  date: string;
  createdAt: string;
}

export const parentService = {
  async getChildren(): Promise<{ children: Child[] }> {
    const response = await api.get('/parents/me/children');
    return response.data;
  },

  async getChildrenMarks(): Promise<{ marks: ChildMark[] }> {
    const response = await api.get('/parents/me/marks');
    return response.data;
  },

  async getProfile(): Promise<any> {
    const response = await api.get('/parents/me');
    return response.data;
  },
};