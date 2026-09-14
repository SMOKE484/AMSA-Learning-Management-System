import { describe, it, expect } from "vitest";
import { resolveScheduleSortOrder } from "../utils/scheduleSort.js";

// GET /api/schedules is used both by list views that expect soonest-first
// (tutor "my upcoming classes", attendance pickers) and by ManageSchedules,
// which needs newest/most-recently-scheduled classes on top so upcoming
// classes aren't buried under a large history of completed ones once the
// table's row cap is hit. The `sort` query param controls this per-caller;
// every existing caller that omits it must keep getting the original
// ascending (soonest-first) order.
describe("resolveScheduleSortOrder", () => {
  it("defaults to ascending (1) when no sort param is given", () => {
    expect(resolveScheduleSortOrder(undefined)).toBe(1);
  });

  it("returns descending (-1) for 'desc'", () => {
    expect(resolveScheduleSortOrder("desc")).toBe(-1);
  });

  it("returns ascending (1) for 'asc'", () => {
    expect(resolveScheduleSortOrder("asc")).toBe(1);
  });

  it("falls back to ascending for an empty string", () => {
    expect(resolveScheduleSortOrder("")).toBe(1);
  });

  it("falls back to ascending for an unrecognized value rather than throwing", () => {
    expect(resolveScheduleSortOrder("banana")).toBe(1);
  });

  it("is case-insensitive for 'DESC'", () => {
    expect(resolveScheduleSortOrder("DESC")).toBe(-1);
  });
});
