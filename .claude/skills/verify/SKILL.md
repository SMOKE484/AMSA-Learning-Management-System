---
name: verify
description: How to run and drive the AMSA LMS backend end-to-end for verification without touching production data.
---

# Verifying AMSA LMS backend changes

**⚠️ `backend/.env` points at the PRODUCTION MongoDB Atlas cluster and Upstash Redis** (the same ones Railway uses). Never seed/drive against the default database.

## Isolated run

`MONGO_URI` in `.env` ends with `/` (no db name, no query params). Append a scratch db name and override the port — `dotenv` does not overwrite env vars already set in the shell:

```bash
cd backend
BASE=$(grep -E '^MONGO_URI=' .env | cut -d= -f2- | tr -d '"' | tr -d '\r')
MONGO_URI="${BASE}amsa_verify_claude" PORT=5099 node server.js
```

Redis is still the shared Upstash instance; cache keys are per-user (`cache:<userId>:<url>`) so fresh test users can't collide. Cache invalidation may flush prod cache entries — harmless (refill on next request).

## Seeding

No registration endpoint — create users directly with the backend models (run the script from `backend/` so ESM resolves its node_modules). Users need `bcrypt.hash` passwords; students need a `Student` doc (`grade` is a **string enum "8"–"12"**, `subjects` from `config/academicConfig.js`), tutors a `Tutor` doc with matching `subjects`/`grades`. Drop the scratch db (`mongoose.connection.dropDatabase()`) when done.

## Driving

- Login: `POST /api/auth/login {email,password}` → `{token}` (rate-limited: 10/15min).
- Route mounts: `/api/students`, `/api/tutors`, `/api/parents`, `/api/admin`, `/api/academic` (singular!).
- Tutor upload: `POST /api/tutors/marks/upload` — `grade` must be a **string** ("10") matching the tutor's `grades`; body `{grade, subject, testName, marks:[{studentId, score, total}]}`.
- Tutor edit: `PUT /api/tutors/marks/:markId`; admin: `PUT/DELETE /api/admin/marks/:markId`, `GET /api/admin/marks`.
- Student view: `GET /api/students/marks` (Redis-cached 300s — hit twice and grep server log for `Serving from cache:` to confirm the cache path was exercised).

## Gotchas

- Background Bash tasks start in a different cwd — use absolute paths.
- Web app: `cd react-admin-tutor-web && npx vite build` (uses `VITE_API_URL`, default `http://localhost:5000/api`). Mobile: `cd AMSA-Mobile && npx tsc --noEmit`.
- Server start triggers cron jobs (weekly report, absent alerts) — fine on the scratch db with no push tokens.
