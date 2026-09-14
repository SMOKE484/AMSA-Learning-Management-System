import { describe, it, expect, vi, beforeEach } from "vitest";

// sendManualAttendanceNotification backs both manual/tutor-marked attendance
// (no known check-in time) and NFC-tap attendance (a real check-in time is
// available on the just-updated Attendance doc). Parents want to know not
// just THAT their child checked in but WHEN — see the attendance-page bug
// report in BUGS_AND_FIXES.md. This mocks expo-server-sdk so no real push
// network call is ever attempted, and mocks the Student model so no DB is
// needed — pure "what message body did we build" logic.

const sendPushNotificationsAsync = vi.fn().mockResolvedValue([{ status: "ok", id: "ticket-1" }]);
const chunkPushNotifications = vi.fn((messages) => [messages]);

vi.mock("expo-server-sdk", () => {
  class Expo {
    static isExpoPushToken(token) {
      return typeof token === "string" && token.startsWith("ExponentPushToken");
    }
    chunkPushNotifications(messages) {
      return chunkPushNotifications(messages);
    }
    sendPushNotificationsAsync(chunk) {
      return sendPushNotificationsAsync(chunk);
    }
  }
  return { Expo };
});

vi.mock("../models/student.js", () => ({
  default: { findById: vi.fn(), find: vi.fn() },
}));
vi.mock("../models/user.js", () => ({ default: {} }));
vi.mock("../models/notification.js", () => ({ default: { create: vi.fn() } }));

import Student from "../models/student.js";
import { sendManualAttendanceNotification } from "../utils/notificationService.js";

const makePopulateChain = (result) => {
  const q = {
    populate: vi.fn(() => q),
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
    catch: (reject) => Promise.resolve(result).catch(reject),
  };
  return q;
};

const studentFixture = {
  _id: "student1",
  user: { name: "Thandi M", pushToken: "ExponentPushToken[student-token]" },
  parents: [{ pushToken: "ExponentPushToken[parent-token]" }],
};

describe("sendManualAttendanceNotification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sendPushNotificationsAsync.mockResolvedValue([{ status: "ok", id: "ticket-1" }]);
  });

  it("includes the formatted check-in time in the parent's message when a checkInTime is given (NFC tap)", async () => {
    Student.findById.mockReturnValue(makePopulateChain(studentFixture));

    const checkInTime = new Date("2026-09-14T07:05:00.000Z"); // 09:05 SAST
    await sendManualAttendanceNotification(
      "student1",
      { subject: "Mathematics" },
      "present",
      "staff",
      checkInTime
    );

    expect(sendPushNotificationsAsync).toHaveBeenCalledTimes(1);
    const sentMessages = sendPushNotificationsAsync.mock.calls[0][0];
    const parentMessage = sentMessages.find((m) => m.to === "ExponentPushToken[parent-token]");
    expect(parentMessage).toBeDefined();
    expect(parentMessage.body).toMatch(/Thandi M/);
    expect(parentMessage.body).toMatch(/checked in/i);
    expect(parentMessage.body).toMatch(/Mathematics/);
    // A time-of-day, not just a date — e.g. "09:05 AM"
    expect(parentMessage.body).toMatch(/\d{1,2}:\d{2}\s*(AM|PM)/i);
  });

  it("falls back to the old status-only message when no checkInTime is given (manual/tutor marking)", async () => {
    Student.findById.mockReturnValue(makePopulateChain(studentFixture));

    await sendManualAttendanceNotification("student1", { subject: "Mathematics" }, "absent", "tutor");

    const sentMessages = sendPushNotificationsAsync.mock.calls[0][0];
    const parentMessage = sentMessages.find((m) => m.to === "ExponentPushToken[parent-token]");
    expect(parentMessage.body).toMatch(/marked absent/i);
    expect(parentMessage.body).not.toMatch(/\d{1,2}:\d{2}\s*(AM|PM)/i);
  });

  it("does not notify a parent with no push token, and does not throw", async () => {
    Student.findById.mockReturnValue(
      makePopulateChain({
        _id: "student2",
        user: { name: "No Token Kid", pushToken: null },
        parents: [{ pushToken: null }],
      })
    );

    await expect(
      sendManualAttendanceNotification("student2", { subject: "English" }, "present", "staff", new Date())
    ).resolves.not.toThrow();
    expect(sendPushNotificationsAsync).not.toHaveBeenCalled();
  });

  it("does nothing when the student cannot be found (deleted/bad id), without throwing", async () => {
    Student.findById.mockReturnValue(makePopulateChain(null));

    await expect(
      sendManualAttendanceNotification("missing-student", { subject: "English" }, "present", "staff", new Date())
    ).resolves.not.toThrow();
    expect(sendPushNotificationsAsync).not.toHaveBeenCalled();
  });
});
