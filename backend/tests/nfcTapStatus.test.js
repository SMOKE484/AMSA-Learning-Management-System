import { describe, it, expect } from "vitest";
import { TimeService } from "../utils/timeService.js";

// NFC tap attendance must be "present" for the entire class window (start to end)
// and only flip to "late" once the tap lands more than the grace period after the
// class END time — not the start time. See BUGS_AND_FIXES.md.
describe("TimeService.getNfcTapStatus", () => {
  const classStart = new Date("2026-09-14T07:00:00.000Z"); // 09:00 SAST
  const classEnd = new Date("2026-09-14T08:00:00.000Z"); // 10:00 SAST
  const graceMinutes = 15;

  it("is present when tapping right at class start", () => {
    expect(TimeService.getNfcTapStatus(classStart, classEnd, graceMinutes)).toBe("present");
  });

  it("is present when tapping in the middle of the class (previously the reported bug: this was marked late)", () => {
    const midClass = new Date(classStart.getTime() + 30 * 60000); // 09:30
    expect(TimeService.getNfcTapStatus(midClass, classEnd, graceMinutes)).toBe("present");
  });

  it("is present when tapping a few minutes before class start", () => {
    const beforeStart = new Date(classStart.getTime() - 5 * 60000); // 08:55
    expect(TimeService.getNfcTapStatus(beforeStart, classEnd, graceMinutes)).toBe("present");
  });

  it("is present exactly at class end time", () => {
    expect(TimeService.getNfcTapStatus(classEnd, classEnd, graceMinutes)).toBe("present");
  });

  it("is present exactly at the grace boundary (end + grace minutes)", () => {
    const atBoundary = new Date(classEnd.getTime() + graceMinutes * 60000); // 10:15
    expect(TimeService.getNfcTapStatus(atBoundary, classEnd, graceMinutes)).toBe("present");
  });

  it("is late one minute past the grace boundary", () => {
    const pastBoundary = new Date(classEnd.getTime() + graceMinutes * 60000 + 60000); // 10:16
    expect(TimeService.getNfcTapStatus(pastBoundary, classEnd, graceMinutes)).toBe("late");
  });

  it("is late well after the grace period", () => {
    const wayLate = new Date(classEnd.getTime() + 60 * 60000); // 11:00
    expect(TimeService.getNfcTapStatus(wayLate, classEnd, graceMinutes)).toBe("late");
  });

  it("falls back to a 15-minute grace period when none is configured", () => {
    const atDefaultBoundary = new Date(classEnd.getTime() + 15 * 60000);
    const pastDefaultBoundary = new Date(classEnd.getTime() + 16 * 60000);
    expect(TimeService.getNfcTapStatus(atDefaultBoundary, classEnd)).toBe("present");
    expect(TimeService.getNfcTapStatus(pastDefaultBoundary, classEnd)).toBe("late");
  });

  it("treats a zero-minute grace period as late immediately after class end", () => {
    const justAfterEnd = new Date(classEnd.getTime() + 60000);
    expect(TimeService.getNfcTapStatus(justAfterEnd, classEnd, 0)).toBe("late");
  });
});
