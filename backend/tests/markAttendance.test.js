import { describe, it, expect, vi, beforeEach } from "vitest";

// Root cause (found via the admin "Attendance Tracker" table showing "-" in
// Check-in Time for every "Present" student marked through the manual
// register): markStudentAttendance/markBatchAttendance only ever $set
// {status, isVerified, autoMarked, notes, manualOverride} — checkIn is never
// touched, so a manually-marked "present"/"late" student never gets a
// checkIn.time, forever. See BUGS_AND_FIXES.md.
//
// Fix under test: marking present/late sets checkIn.time (to the marking
// moment, verificationMethod "manual") when the record doesn't already have
// a real one (e.g. from an earlier NFC tap/self check-in, which must never
// be clobbered by a later manual correction); marking absent/excused never
// touches checkIn; and parents are notified with that check-in time.

const makeQueryMock = (result) => {
  const q = {
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
    catch: (reject) => Promise.resolve(result).catch(reject),
  };
  return q;
};

vi.mock("../models/classSchedule.js", () => ({ default: { findById: vi.fn() } }));
vi.mock("../models/student.js", () => ({ default: { findById: vi.fn() } }));
vi.mock("../models/attendance.js", () => ({
  default: { findOne: vi.fn(), findOneAndUpdate: vi.fn() },
}));
vi.mock("../models/tutor.js", () => ({ default: {} }));
vi.mock("../models/schoolConfig.js", () => ({ default: { getConfig: vi.fn() } }));
vi.mock("../models/card.js", () => ({ default: {} }));
vi.mock("../utils/notificationService.js", () => ({
  NotificationService: { sendManualAttendanceNotification: vi.fn() },
}));

import ClassSchedule from "../models/classSchedule.js";
import Student from "../models/student.js";
import Attendance from "../models/attendance.js";
import { NotificationService } from "../utils/notificationService.js";
import { markStudentAttendance, markBatchAttendance } from "../controllers/attendanceController.js";

const makeRes = () => {
  const res = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
};

const classSchedule = {
  _id: "class1",
  tutor: "tutor1",
  subject: "Natural Sciences",
  students: ["student1"],
};

describe("markStudentAttendance — check-in time on manual marking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ClassSchedule.findById.mockResolvedValue(classSchedule);
    Student.findById.mockResolvedValue({ _id: "student1" });
    Attendance.findOneAndUpdate.mockImplementation((filter, update) => ({ ...update.$set, _id: "att1" }));
  });

  it("sets checkIn.time when marking present with no prior attendance record", async () => {
    Attendance.findOne.mockResolvedValueOnce(null);
    const req = {
      params: { classId: "class1" },
      body: { studentId: "student1", status: "present" },
      role: "admin", userId: "admin1",
    };
    const res = makeRes();

    await markStudentAttendance(req, res);

    const updateArg = Attendance.findOneAndUpdate.mock.calls[0][1];
    expect(updateArg.$set.checkIn?.time).toBeInstanceOf(Date);
    expect(updateArg.$set.checkIn?.verificationMethod).toBe("manual");

    expect(NotificationService.sendManualAttendanceNotification).toHaveBeenCalledTimes(1);
    const notifyArgs = NotificationService.sendManualAttendanceNotification.mock.calls[0];
    expect(notifyArgs[4]).toBeInstanceOf(Date); // checkInTime passed through
  });

  it("sets checkIn.time when marking late (a delayed but real check-in)", async () => {
    Attendance.findOne.mockResolvedValueOnce(null);
    const req = {
      params: { classId: "class1" },
      body: { studentId: "student1", status: "late" },
      role: "admin", userId: "admin1",
    };
    const res = makeRes();

    await markStudentAttendance(req, res);

    const updateArg = Attendance.findOneAndUpdate.mock.calls[0][1];
    expect(updateArg.$set.checkIn?.time).toBeInstanceOf(Date);
  });

  it("does not set checkIn when marking absent", async () => {
    Attendance.findOne.mockResolvedValueOnce(null);
    const req = {
      params: { classId: "class1" },
      body: { studentId: "student1", status: "absent" },
      role: "admin", userId: "admin1",
    };
    const res = makeRes();

    await markStudentAttendance(req, res);

    const updateArg = Attendance.findOneAndUpdate.mock.calls[0][1];
    expect(updateArg.$set.checkIn).toBeUndefined();

    const notifyArgs = NotificationService.sendManualAttendanceNotification.mock.calls[0];
    expect(notifyArgs[4]).toBeFalsy();
  });

  it("does not set checkIn when marking excused", async () => {
    Attendance.findOne.mockResolvedValueOnce(null);
    const req = {
      params: { classId: "class1" },
      body: { studentId: "student1", status: "excused" },
      role: "admin", userId: "admin1",
    };
    const res = makeRes();

    await markStudentAttendance(req, res);

    const updateArg = Attendance.findOneAndUpdate.mock.calls[0][1];
    expect(updateArg.$set.checkIn).toBeUndefined();
  });

  it("preserves a pre-existing real check-in time (NFC/self check-in) instead of overwriting it with the manual-marking timestamp", async () => {
    const realCheckIn = { time: new Date("2026-09-14T07:05:00.000Z"), verificationMethod: "nfc" };
    Attendance.findOne.mockResolvedValueOnce({ status: "present", checkIn: realCheckIn });

    const req = {
      params: { classId: "class1" },
      body: { studentId: "student1", status: "late", reason: "correcting status" },
      role: "admin", userId: "admin1",
    };
    const res = makeRes();

    await markStudentAttendance(req, res);

    const updateArg = Attendance.findOneAndUpdate.mock.calls[0][1];
    // Must not clobber the real NFC check-in time with a synthetic "now".
    expect(updateArg.$set.checkIn).toBeUndefined();
  });

  it("rejects marking a student not enrolled in the class", async () => {
    const req = {
      params: { classId: "class1" },
      body: { studentId: "not-enrolled-student", status: "present" },
      role: "admin", userId: "admin1",
    };
    const res = makeRes();

    await markStudentAttendance(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(Attendance.findOneAndUpdate).not.toHaveBeenCalled();
  });
});

describe("markBatchAttendance — check-in time on manual marking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ClassSchedule.findById.mockResolvedValue({ ...classSchedule, students: ["student1", "student2"] });
    Attendance.findOneAndUpdate.mockImplementation((filter, update) => ({ ...update.$set, _id: "att-batch" }));
  });

  it("sets checkIn.time per-student for present, and not for absent, in the same batch", async () => {
    Attendance.findOne.mockResolvedValue(null);

    const req = {
      params: { classId: "class1" },
      body: {
        students: [
          { studentId: "student1", status: "present" },
          { studentId: "student2", status: "absent" },
        ],
      },
      role: "admin", userId: "admin1",
    };
    const res = makeRes();

    await markBatchAttendance(req, res);

    const calls = Attendance.findOneAndUpdate.mock.calls;
    const presentCall = calls.find(c => c[0].student === "student1");
    const absentCall = calls.find(c => c[0].student === "student2");

    expect(presentCall[1].$set.checkIn?.time).toBeInstanceOf(Date);
    expect(absentCall[1].$set.checkIn).toBeUndefined();
  });

  it("a double batch-save for the same class does not create duplicate Attendance docs (upsert on class+student)", async () => {
    Attendance.findOne.mockResolvedValue({ status: "present", checkIn: { time: new Date() } });

    const req = {
      params: { classId: "class1" },
      body: { students: [{ studentId: "student1", status: "present" }] },
      role: "admin", userId: "admin1",
    };
    const res1 = makeRes();
    const res2 = makeRes();

    await markBatchAttendance(req, res1);
    await markBatchAttendance(req, res2);

    // Each call upserts via findOneAndUpdate keyed on {class, student} — no
    // separate create path exists, so two saves can only ever update the
    // same doc, never create a second one.
    expect(Attendance.findOneAndUpdate).toHaveBeenCalledTimes(2);
    const [firstFilter] = Attendance.findOneAndUpdate.mock.calls[0];
    const [secondFilter] = Attendance.findOneAndUpdate.mock.calls[1];
    expect(firstFilter).toEqual(secondFilter);
  });
});
