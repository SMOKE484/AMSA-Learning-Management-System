// src/types/index.ts
export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

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
}

export interface Attendance {
  _id: string;
  date: string;
  status: 'present' | 'absent' | 'late';
  subject: string;
  notes?: string;
}