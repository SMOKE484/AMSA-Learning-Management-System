// src/utils/attendanceDisplay.ts
import { ChildAttendanceRecord } from '../services/parent';

export interface ChildGroup {
  id: string;
  name: string;
  records: ChildAttendanceRecord[];
}

/**
 * Groups attendance records by student ID (never by display name — siblings
 * can share a name, which would silently merge their sections and hide one
 * child's records). Preserves first-seen order of children and of each
 * child's records.
 */
export const groupRecordsByChild = (records: ChildAttendanceRecord[]): ChildGroup[] => {
  const groups = new Map<string, ChildGroup>();

  records.forEach(record => {
    const id = record.student?._id;
    if (!id) return;
    const name = record.student?.user?.name || 'Unknown';
    let group = groups.get(id);
    if (!group) {
      group = { id, name, records: [] };
      groups.set(id, group);
    }
    group.records.push(record);
  });

  return Array.from(groups.values());
};

/**
 * Formats the actual check-in time-of-day (e.g. "09:05 AM"). Returns null
 * when the record has no recorded check-in time (e.g. attendance marked
 * manually by a tutor rather than via self check-in/NFC tap) — callers
 * should render an explicit "not checked in" state rather than silently
 * falling back to a date with no time component.
 */
export const formatCheckInTime = (record: ChildAttendanceRecord): string | null => {
  const time = record.checkIn?.time;
  if (!time) return null;
  const date = new Date(time);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', hour12: true });
};
