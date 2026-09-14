// src/utils/attendanceDisplay.test.ts
import { groupRecordsByChild, formatCheckInTime } from './attendanceDisplay';
import { ChildAttendanceRecord } from '../services/parent';

// Root causes behind "check-in times not showing for other children" on the
// parent Attendance screen (AttendanceScreen.tsx): (1) records were grouped
// by display NAME instead of student _id, silently merging siblings who
// share a name; (2) the screen never rendered an actual HH:MM check-in
// time at all, only a date. See BUGS_AND_FIXES.md.

const makeRecord = (overrides: Partial<ChildAttendanceRecord> = {}): ChildAttendanceRecord => ({
  _id: 'rec1',
  student: { _id: 'student1', user: { name: 'Thandi M' } },
  class: { subject: 'Mathematics', scheduledDate: '2026-09-14', grade: '10' },
  status: 'present',
  checkIn: { time: '2026-09-14T07:05:00.000Z' },
  createdAt: '2026-09-14T07:05:00.000Z',
  ...overrides,
});

describe('groupRecordsByChild', () => {
  it('groups records under the child they belong to', () => {
    const records = [
      makeRecord({ _id: 'r1', student: { _id: 'student1', user: { name: 'Thandi M' } } }),
      makeRecord({ _id: 'r2', student: { _id: 'student1', user: { name: 'Thandi M' } } }),
      makeRecord({ _id: 'r3', student: { _id: 'student2', user: { name: 'Sipho M' } } }),
    ];

    const groups = groupRecordsByChild(records);

    expect(groups).toHaveLength(2);
    const thandi = groups.find(g => g.id === 'student1');
    const sipho = groups.find(g => g.id === 'student2');
    expect(thandi?.records).toHaveLength(2);
    expect(sipho?.records).toHaveLength(1);
  });

  it('keeps two children with the same name as separate groups (siblings/name collision)', () => {
    const records = [
      makeRecord({ _id: 'r1', student: { _id: 'student1', user: { name: 'Sam Ndlovu' } } }),
      makeRecord({ _id: 'r2', student: { _id: 'student2', user: { name: 'Sam Ndlovu' } } }),
    ];

    const groups = groupRecordsByChild(records);

    expect(groups).toHaveLength(2);
    expect(groups.map(g => g.id).sort()).toEqual(['student1', 'student2']);
    // Each same-named child keeps their own single record, not merged into one.
    groups.forEach(g => expect(g.records).toHaveLength(1));
  });

  it('returns an empty array for an empty record list', () => {
    expect(groupRecordsByChild([])).toEqual([]);
  });

  it('skips a record with no linked student rather than crashing', () => {
    const records = [makeRecord({ _id: 'r1', student: undefined as any })];
    expect(() => groupRecordsByChild(records)).not.toThrow();
    expect(groupRecordsByChild(records)).toEqual([]);
  });
});

describe('formatCheckInTime', () => {
  it('formats a real check-in time as a time-of-day string, not just a date', () => {
    const record = makeRecord({ checkIn: { time: '2026-09-14T07:05:00.000Z' } });
    const formatted = formatCheckInTime(record);
    expect(formatted).not.toBeNull();
    expect(formatted).toMatch(/\d{1,2}:\d{2}\s*(AM|PM)/i);
  });

  it('returns null when the record has no check-in time (manually-marked attendance)', () => {
    const record = makeRecord({ checkIn: undefined });
    expect(formatCheckInTime(record)).toBeNull();
  });

  it('returns null rather than "Invalid Date" for a malformed time value', () => {
    const record = makeRecord({ checkIn: { time: 'not-a-real-date' } });
    expect(formatCheckInTime(record)).toBeNull();
  });
});
