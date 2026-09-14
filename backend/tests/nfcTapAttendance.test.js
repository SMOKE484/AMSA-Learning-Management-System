import { describe, it, expect, vi, beforeEach } from "vitest";

// nfcTapAttendance is a submission endpoint (Workflow Rule 2): a double tap
// of the same card for the same class must not create a duplicate
// Attendance doc or fire a second parent notification. It's also the
// endpoint being modified here to pass the real check-in time through to
// NotificationService.sendManualAttendanceNotification so parents learn
// WHEN their child checked in, not just that they did.

const makeQueryMock = (result) => {
  const q = {
    populate: vi.fn(() => q),
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
    catch: (reject) => Promise.resolve(result).catch(reject),
  };
  return q;
};

vi.mock("../models/card.js", () => ({ default: { findOne: vi.fn() } }));
vi.mock("../models/attendance.js", () => ({
  default: { findOne: vi.fn(), findOneAndUpdate: vi.fn() },
}));
vi.mock("../models/classSchedule.js", () => ({ default: { findById: vi.fn(), find: vi.fn() } }));
vi.mock("../models/student.js", () => ({ default: { findOne: vi.fn() } }));
vi.mock("../models/schoolConfig.js", () => ({
  default: { getConfig: vi.fn().mockResolvedValue({ nfcLateGraceMinutes: 15 }) },
}));
vi.mock("../utils/notificationService.js", () => ({
  NotificationService: { sendManualAttendanceNotification: vi.fn() },
}));

import Card from "../models/card.js";
import Attendance from "../models/attendance.js";
import { NotificationService } from "../utils/notificationService.js";
import { nfcTapAttendance } from "../controllers/attendanceController.js";

const makeRes = () => {
  const res = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
};

const classSchedule = {
  _id: "class1",
  title: "Grade 10 Maths",
  subject: "Mathematics",
  startTime: "09:00",
  // Always in the future relative to whenever the test runs, so the tap is
  // deterministically "present" regardless of wall-clock time.
  classEndTime: new Date(Date.now() + 60 * 60 * 1000),
  students: ["student1"],
};

const card = {
  _id: "card1",
  token: "card-token-abc",
  status: "active",
  student: { _id: "student1", user: { name: "Thandi M" }, photoUrl: null, grade: "10" },
  save: vi.fn().mockResolvedValue(true),
};

describe("nfcTapAttendance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Card.findOne.mockReturnValue(makeQueryMock(card));
    card.save.mockResolvedValue(true);
  });

  it("marks attendance and notifies parents with the check-in time on a fresh tap", async () => {
    Attendance.findOne.mockResolvedValueOnce(null); // not previously marked
    const savedAttendance = {
      _id: "att1",
      status: "present",
      checkIn: { time: new Date("2026-09-14T07:05:00.000Z") },
    };
    Attendance.findOneAndUpdate.mockResolvedValue(savedAttendance);

    const req = { body: { cardToken: "card-token-abc", classId: "class1" }, userId: "staff1", role: "staff" };
    const res = makeRes();

    // classId is provided, so the controller looks up ClassSchedule.findById
    const ClassSchedule = (await import("../models/classSchedule.js")).default;
    ClassSchedule.findById.mockResolvedValue(classSchedule);

    await nfcTapAttendance(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, alreadyMarked: false, status: "present" })
    );
    expect(NotificationService.sendManualAttendanceNotification).toHaveBeenCalledTimes(1);
    const callArgs = NotificationService.sendManualAttendanceNotification.mock.calls[0];
    // (studentId, classDetails, status, markedByRole, checkInTime)
    expect(callArgs[4]).toEqual(savedAttendance.checkIn.time);
  });

  it("a double tap (same card, same class) does not create a second Attendance write or a second notification", async () => {
    const existing = {
      _id: "att1",
      status: "present",
      checkIn: { time: new Date("2026-09-14T07:05:00.000Z") },
    };
    Attendance.findOne.mockResolvedValueOnce(existing); // already marked

    const req = { body: { cardToken: "card-token-abc", classId: "class1" }, userId: "staff1", role: "staff" };
    const res = makeRes();

    const ClassSchedule = (await import("../models/classSchedule.js")).default;
    ClassSchedule.findById.mockResolvedValue(classSchedule);

    await nfcTapAttendance(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, alreadyMarked: true, status: "present" })
    );
    expect(Attendance.findOneAndUpdate).not.toHaveBeenCalled();
    expect(NotificationService.sendManualAttendanceNotification).not.toHaveBeenCalled();
  });

  it("rejects an unrecognized card token without touching Attendance", async () => {
    Card.findOne.mockReturnValue(makeQueryMock(null));

    const req = { body: { cardToken: "not-a-real-token", classId: "class1" }, userId: "staff1", role: "staff" };
    const res = makeRes();

    await nfcTapAttendance(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(Attendance.findOneAndUpdate).not.toHaveBeenCalled();
  });
});
