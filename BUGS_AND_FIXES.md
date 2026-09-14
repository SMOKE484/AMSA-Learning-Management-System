# Bugs and Fixes

Log every bug here when found; update the same entry when it's fixed. Check this file before fixing a new bug so a previously-fixed one doesn't get silently reintroduced.

---

## Parent Attendance screen: check-in times not showing for other children

**Found:** 2026-09-14
**Status:** Fixed 2026-09-14

**Symptom:** On the mobile parent Attendance screen ([AttendanceScreen.tsx](AMSA-Mobile/src/screens/parent/AttendanceScreen.tsx)), a parent with multiple children could see attendance records for one child but not for a sibling — the sibling's section was missing or empty. Separately, the screen never actually rendered a check-in *time* for any child, only a date.

**Root cause:** Two independent bugs, both traced to [parentController.js](backend/controllers/parentController.js) and [AttendanceScreen.tsx](AMSA-Mobile/src/screens/parent/AttendanceScreen.tsx):
1. **Backend (primary):** `getMyChildrenAttendanceRecords` (and the identical pattern in `getMyChildrenMarks`) queried `Attendance.find({ student: { $in: childrenIds } })` with **one combined sort+limit across the whole family** (default `limit: 50`). A child with more classes than a sibling could fill the entire 50-record window, silently pushing the sibling's records out of the response entirely — not just missing a time, missing from the screen altogether.
2. **Frontend:** `AttendanceScreen.tsx` grouped records by `student.user.name` (a display string) instead of `student._id`, so two children sharing a name would have their sections merged. It also never formatted an actual HH:MM check-in time anywhere — `formatDate` only ever rendered a date.

**Fix:**
- `parentController.js`: `getMyChildrenAttendanceRecords` and `getMyChildrenMarks` now query **per child** (`Promise.all` over each child's own `find().sort().skip().limit()`), each capped at the page limit independently, then merge and re-sort by `createdAt` — no sibling can starve another out of the response regardless of how many records they have.
- `AttendanceScreen.tsx`: grouping extracted to a pure, tested helper [`groupRecordsByChild`](AMSA-Mobile/src/utils/attendanceDisplay.ts) keyed by `student._id`; added `formatCheckInTime` to render the actual check-in time ("Checked in at 09:05 AM") next to the date, falling back to nothing (not a fabricated date-as-time) when the record has no `checkIn.time`.
- Also extended parent notifications: `NotificationService.sendManualAttendanceNotification` ([notificationService.js](backend/utils/notificationService.js)) now accepts an optional `checkInTime` and includes it in the parent's push body ("checked in for Mathematics at 09:05 AM"); `nfcTapAttendance` ([attendanceController.js](backend/controllers/attendanceController.js)) now passes `attendance.checkIn.time` through so parents are notified of the actual check-in time, not just a status change. (Self check-in already had this via `sendAttendanceConfirmation` — this closes the same gap for NFC-tap attendance.)
- Tests first, per Workflow Rule 1: [parentController.test.js](backend/tests/parentController.test.js) (fairness-across-siblings, per-child limit, no-children empty state, DB-unreachable 500), [notificationService.test.js](backend/tests/notificationService.test.js) (time included/omitted, no-token/no-student no-ops), [nfcTapAttendance.test.js](backend/tests/nfcTapAttendance.test.js) (fresh tap sends the time-bearing notification, a double tap sends **no** second notification and writes no duplicate `Attendance` doc, unrecognized card rejected). Mobile: set up Jest + `jest-expo` (previously no test runner in `AMSA-Mobile/`) and [attendanceDisplay.test.ts](AMSA-Mobile/src/utils/attendanceDisplay.test.ts) (grouping by ID, same-name siblings kept separate, empty list, missing-student record, time formatting present/missing/malformed). All failed against the pre-fix code, all pass now (30 backend, 7 mobile).

---

## NFC tap attendance marks students "late" even when tapped on time

**Found:** 2026-09-14
**Status:** Fixed 2026-09-14

**Symptom:** Students tapping their NFC card any time after the first few minutes of class — even well before the class ended — were marked "late" instead of "present". E.g. a 9:00–10:00 class marked a student late for tapping at 9:15, even though the class was still running.

**Root cause:** [attendanceController.js](backend/controllers/attendanceController.js) `nfcTapAttendance` computed the present/late boundary as `classSchedule.classStartTime + SchoolConfig.nfcLateGraceMinutes` (default 10 min) — i.e. anchored to when the class *started*, not when it ended. Any tap more than 10 minutes into a class, which is most of a typical 45–60 minute class, was flagged "late" regardless of how much of the class remained. This matched what was (incorrectly) documented as intentional in `CLAUDE.md`'s business-rules table, so it read as "working as designed" rather than a bug until checked against how the school actually wants attendance to behave.

**Fix:**
- Added `TimeService.getNfcTapStatus(tapTime, classEndTime, graceMinutes)` in [timeService.js](backend/utils/timeService.js) — a pure function: "present" for any tap up through `classEndTime + graceMinutes`, "late" after that. A tap before class start is present too (harmless early arrival).
- `nfcTapAttendance` now calls this against `classSchedule.classEndTime` instead of the old inline `classStartTime`-based calculation.
- `SchoolConfig.nfcLateGraceMinutes` default bumped from 10 to 15 (minutes after class **end**, matching the self-check-out buffer's default and the school's stated 15-minute grace period) — [schoolConfig.js](backend/models/schoolConfig.js).
- Updated the stale field label in [SchoolConfigScreen.tsx](AMSA-Mobile/src/screens/admin/SchoolConfigScreen.tsx) ("...after class start" → "...after class end") and the business-rules row in `CLAUDE.md` to match.
- Tests first, per Workflow Rule 1: [nfcTapStatus.test.js](backend/tests/nfcTapStatus.test.js) — 9 cases covering mid-class taps (the reported bug), before-class-start taps, exactly-at-start/end/boundary taps, one-minute-past-boundary, well-past-boundary, the config-default fallback, and a zero-minute grace edge case. All failed against the old code (`getNfcTapStatus is not a function` before the fix existed, and would have failed the mid-class case against the old start-anchored logic), all pass now.
- Verified end-to-end against a scratch DB (`amsa_verify_claude`): a real `POST /api/attendance/nfc-tap` call against a class 10 minutes into a 30-minute window returned `status: "present"` (previously would have been `"late"`); a class that ended 20 minutes ago (grace 15 min) returned `status: "late"`; a double-tap on the same student/class returned `alreadyMarked: true` with no duplicate `Attendance` doc.

---

## Admin Dashboard / Manage Schedules show inaccurate class counts

**Found:** 2026-09-14
**Status:** Fixed 2026-09-14

**Symptom:** Admin Dashboard's "Total Classes" and "Today's Classes" tiles, and the Manage Class Schedules page's "Total/Upcoming/Ongoing/Completed" stat cards and table, showed wrong numbers once the school had more than 10 classes — undercounting totals and sometimes missing today's classes entirely, even though they existed.

**Root cause:** `GET /api/schedules` ([backend/controllers/scheduleController.js](backend/controllers/scheduleController.js) `getSchedules`) is paginated with a default `limit: 10`, sorted `scheduledDate: 1` (oldest first). [AdminDashboard.jsx](react-admin-tutor-web/src/pages/Admin/AdminDashboard.jsx) and [ManageSchedules.jsx](react-admin-tutor-web/src/pages/Admin/ManageSchedules.jsx) both called `api.get('/schedules')` with no params, so every stat on those pages was derived from `schedules.length` / `.filter(...).length` over just the oldest 10 records in the whole database, rather than the true totals. The endpoint already returns an accurate `pagination.total` (from `ClassSchedule.countDocuments(filter)`), but neither page read it.

This is the same class of bug as the fix in `c6a1402` ("Mark Attendance class picker missing recent classes on web admin"), which added `{ params: { limit: 200 } }` to the `/schedules` call in [ClassAttendance.jsx](react-admin-tutor-web/src/pages/Admin/ClassAttendance.jsx) — that fix was never applied to AdminDashboard or ManageSchedules, so the same truncation bug persisted there.

A secondary issue in the same code: `AdminDashboard`'s "Today's Classes" computed "today" via `new Date().toISOString().split('T')[0]` (UTC date), which can be off by one calendar day from the school's actual SAST day near midnight SAST — consistent with the timezone bug class already fixed once in `fc5d8ba` for class-time storage.

**Fix:**
- `AdminDashboard.jsx`: reads `pagination.total` from a minimal (`limit: 1`) `/schedules` call for "Total Classes", and a second `/schedules` call filtered by `startDate`/`endDate` (computed in `Africa/Johannesburg`, not the browser's local/UTC date) for "Today's Classes" — both accurate regardless of how many schedules exist.
- `ManageSchedules.jsx`: fetches the table with a much higher `limit: 500` so more classes are visible, and separately reads `pagination.total` for "Total Classes" plus three per-status (`status=scheduled|ongoing|completed`) totals for the stat cards — none of them derived from the (still potentially capped) table array.
- Added Vitest + React Testing Library to `react-admin-tutor-web/` (previously had no test runner) and wrote reproducing tests first: [AdminDashboard.test.jsx](react-admin-tutor-web/src/pages/Admin/AdminDashboard.test.jsx), [ManageSchedules.test.jsx](react-admin-tutor-web/src/pages/Admin/ManageSchedules.test.jsx).
- Verified end-to-end against a scratch DB seeded with 25 schedules (22 old + 3 "today"): dashboard and schedules page both showed the correct 25/3/22/3/0 numbers after the fix, vs. 10/0/… before.
