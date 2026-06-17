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
  NotificationSettings: undefined;
  NotificationList: undefined;
};

export type StudentStackParamList = RootStackParamList;

export type ParentStackParamList = {
  Dashboard: undefined;
  Children: undefined;
  Marks: undefined;
  Profile: undefined;
  NotificationSettings: undefined;
  NotificationList: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
