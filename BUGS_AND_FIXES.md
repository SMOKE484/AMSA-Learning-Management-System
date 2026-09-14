# Bugs and Fixes

Log every bug here when found; update the same entry when it's fixed. Check this file before fixing a new bug so a previously-fixed one doesn't get silently reintroduced.

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
