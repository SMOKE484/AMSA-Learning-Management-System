import { describe, it, expect } from "vitest";
import { PREDEFINED_GRADES, PREDEFINED_SUBJECTS } from "../config/academicConfig.js";

describe("academicConfig", () => {
  it("exposes grades 8 through 12 as numbers, no more, no less", () => {
    expect(PREDEFINED_GRADES).toEqual([8, 9, 10, 11, 12]);
    for (const grade of PREDEFINED_GRADES) {
      expect(typeof grade).toBe("number");
    }
  });

  it("has no duplicate grades", () => {
    expect(new Set(PREDEFINED_GRADES).size).toBe(PREDEFINED_GRADES.length);
  });

  it("has no duplicate or empty subject names", () => {
    expect(new Set(PREDEFINED_SUBJECTS).size).toBe(PREDEFINED_SUBJECTS.length);
    for (const subject of PREDEFINED_SUBJECTS) {
      expect(typeof subject).toBe("string");
      expect(subject.trim().length).toBeGreaterThan(0);
    }
  });
});
