// src/types/navigation.ts
import { ClassSchedule } from '../services/student';

export type RootStackParamList = {
  Dashboard: undefined;
  ClassDetails: {
    classId: string;
    className?: string;
    subject?: string;
    classData?: ClassSchedule;
  };
  Calendar: undefined;
  Notes: undefined;
  Marks: undefined;
  Attendance: undefined;
  Profile: undefined;
  // Add other screens here
};

// This helps TypeScript know what screens exist and what params they accept
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}