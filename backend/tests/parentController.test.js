import { describe, it, expect, vi, beforeEach } from "vitest";

// Root cause: getMyChildrenAttendanceRecords / getMyChildrenMarks queried
// `{ student: { $in: childrenIds } }` with a single GLOBAL sort+limit across
// every child of the parent combined. A parent whose one child has more
// classes/marks than the page limit silently starves every other child out
// of the response entirely — that child's section vanishes from the
// Attendance screen. See BUGS_AND_FIXES.md.
//
// Collaborators (Mongoose models) are mocked — this is pure controller
// logic (how records are fetched/merged per child), not a DB integration
// test, so no scratch database is needed here.

// A minimal thenable Mongoose-query-chain mock: every chain method returns
// `this` and awaiting the chain resolves to `result` (array-sliced per any
// skip()/limit() calls, mirroring what a real Mongoose query would do), so
// tests asserting fairness-under-a-limit exercise real slicing behavior.
const makeQueryMock = (result) => {
  let skipN = 0;
  let limitN = undefined;
  const q = {
    populate: vi.fn(() => q),
    select: vi.fn(() => q),
    sort: vi.fn(() => q),
    skip: vi.fn((n) => { skipN = n; return q; }),
    limit: vi.fn((n) => { limitN = n; return q; }),
    then: (resolve, reject) => {
      const value = Array.isArray(result)
        ? result.slice(skipN, limitN !== undefined ? skipN + limitN : undefined)
        : result;
      return Promise.resolve(value).then(resolve, reject);
    },
    catch: (reject) => Promise.resolve(result).catch(reject),
  };
  return q;
};

vi.mock("../models/student.js", () => ({
  default: { find: vi.fn() },
}));
vi.mock("../models/attendance.js", () => ({
  default: { find: vi.fn(), aggregate: vi.fn() },
}));
vi.mock("../models/mark.js", () => ({
  default: { find: vi.fn() },
}));
vi.mock("../models/user.js", () => ({
  default: {},
}));

import Student from "../models/student.js";
import Attendance from "../models/attendance.js";
import Mark from "../models/mark.js";
import {
  getMyChildrenAttendanceRecords,
  getMyChildrenMarks,
} from "../controllers/parentController.js";

const makeRes = () => {
  const res = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
};

const childA = "aaaaaaaaaaaaaaaaaaaaaaaa";
const childB = "bbbbbbbbbbbbbbbbbbbbbbbb";

describe("getMyChildrenAttendanceRecords", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns records for a sibling with few records even when another sibling has many more (fairness bug)", async () => {
    Student.find.mockReturnValue(
      makeQueryMock([{ _id: childA }, { _id: childB }])
    );

    // Child A has 60 attendance records (more than the default page limit
    // of 50); Child B has just 2. Each Attendance.find call is per-student
    // now, so we key mock results off the query passed in.
    Attendance.find.mockImplementation((query) => {
      const studentId = query.student;
      if (studentId === childA) {
        const many = Array.from({ length: 60 }, (_, i) => ({
          _id: `a-record-${i}`,
          student: childA,
          createdAt: new Date(2026, 0, 60 - i),
        }));
        return makeQueryMock(many);
      }
      if (studentId === childB) {
        return makeQueryMock([
          { _id: "b-record-1", student: childB, createdAt: new Date(2026, 0, 1) },
          { _id: "b-record-2", student: childB, createdAt: new Date(2026, 0, 2) },
        ]);
      }
      return makeQueryMock([]);
    });

    const req = { userId: "parent1", query: {} };
    const res = makeRes();
    await getMyChildrenAttendanceRecords(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const body = res.json.mock.calls[0][0];
    const returnedStudentIds = new Set(body.records.map((r) => r.student));
    expect(returnedStudentIds.has(childA)).toBe(true);
    expect(returnedStudentIds.has(childB)).toBe(true);
    // Child B's 2 records must both survive, not get pushed out by A's 60.
    expect(body.records.filter((r) => r.student === childB)).toHaveLength(2);
  });

  it("caps each child's records at the requested limit independently", async () => {
    Student.find.mockReturnValue(
      makeQueryMock([{ _id: childA }, { _id: childB }])
    );

    Attendance.find.mockImplementation((query) => {
      const studentId = query.student;
      const many = Array.from({ length: 10 }, (_, i) => ({
        _id: `${studentId}-record-${i}`,
        student: studentId,
        createdAt: new Date(2026, 0, i + 1),
      }));
      return makeQueryMock(many);
    });

    const req = { userId: "parent1", query: { limit: "3" } };
    const res = makeRes();
    await getMyChildrenAttendanceRecords(req, res);

    const body = res.json.mock.calls[0][0];
    expect(body.records.filter((r) => r.student === childA)).toHaveLength(3);
    expect(body.records.filter((r) => r.student === childB)).toHaveLength(3);
  });

  it("returns an empty records array when the parent has no children, without querying Attendance", async () => {
    Student.find.mockReturnValue(makeQueryMock([]));

    const req = { userId: "parent-no-kids", query: {} };
    const res = makeRes();
    await getMyChildrenAttendanceRecords(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ records: [] });
    expect(Attendance.find).not.toHaveBeenCalled();
  });

  it("returns 500 with the error message when the database is unreachable", async () => {
    Student.find.mockImplementation(() => {
      throw new Error("Mongo connection lost");
    });

    const req = { userId: "parent1", query: {} };
    const res = makeRes();
    await getMyChildrenAttendanceRecords(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "Mongo connection lost" });
  });
});

describe("getMyChildrenMarks (same fairness bug in the marks endpoint)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns marks for a sibling with few marks even when another sibling has many more", async () => {
    Student.find.mockReturnValue(
      makeQueryMock([{ _id: childA }, { _id: childB }])
    );

    Mark.find.mockImplementation((query) => {
      const studentId = query.student;
      if (studentId === childA) {
        const many = Array.from({ length: 150 }, (_, i) => ({
          _id: `a-mark-${i}`,
          student: childA,
          createdAt: new Date(2026, 0, 150 - i),
        }));
        return makeQueryMock(many);
      }
      if (studentId === childB) {
        return makeQueryMock([
          { _id: "b-mark-1", student: childB, createdAt: new Date(2026, 0, 1) },
        ]);
      }
      return makeQueryMock([]);
    });

    const req = { userId: "parent1", query: {} };
    const res = makeRes();
    await getMyChildrenMarks(req, res);

    const body = res.json.mock.calls[0][0];
    const returnedStudentIds = new Set(body.marks.map((m) => m.student));
    expect(returnedStudentIds.has(childB)).toBe(true);
  });
});
