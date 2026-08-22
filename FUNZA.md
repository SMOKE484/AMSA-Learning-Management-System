# FUNZA — Full Project Context
> Read this file at the start of any new Claude Code session to get full context.
> UI/Design is handled separately via uploaded design files.
> **2026-07-18:** Added "Decision Refinements" and "Gap Fixes & Recommendations" sections (after the Key Decisions table), plus full feature specs for QR register signing, Intelligence-tier extras, and gate register cards under "Planned Features". This file is self-contained — no other repo files needed for context.

---

## What This Is

There are **two products** being built from the same codebase:

### 1. AMSA App (Original — this repo)
A Learning Management System built for **AMSA Academy**, a single tutoring academy in South Africa. This is the working, deployed original. Features are being added here first, then ported to Funza.

### 2. Funza (New — separate repo to be created)
A **multi-school SaaS platform** that allows any fee-paying secondary school in South Africa to use the same LMS. Funza is a duplicate of AMSA with:
- Multi-tenant architecture (one backend, separate database per school)
- School selection screen on mobile (searchable list before login)
- Custom branding per school (logo + primary color loaded from server)
- Super-admin panel for the platform owner to manage all schools
- Two pricing tiers: **Core (R29/student/month)** and **Intelligence (R59/student/month)**

**Target market:** Fee-paying secondary schools (Grade 8–12) in South Africa
- ~3,100 fee-paying secondary schools (Q4, Q5 public + private independent)
- ~1.67 million learners
- Start with private schools (fastest decisions), scale to Q5 then Q4

---

## Business Model

### Pricing (per student per month)
| Package | Price | Includes |
|---|---|---|
| Core | R29/student/month | All app features, no AI |
| Intelligence | R59/student/month | Everything + AI chatbot + activity tracking + weekly AI parent reports |

### Minimum billing: 20 students per school

### Financial snapshot at 50,000 students (50/50 split)
- Revenue: ~R2,200,000/month
- Tech costs: ~R55,000/month
- After tax (27% CIT) + operations: ~R1.1M–1.9M/month net profit

### Recommended business structure
Family Trust → owns (Pty) Ltd → earns SaaS revenue

### Key tax write-offs
- R&D deduction at 150% (Section 11D) on developer salaries
- Server/cloud costs, staff salaries, marketing, travel — all deductible
- Trust protects assets from divorce and estate duty (20% saving on death)

---

## Technical Stack

### Mobile App (`AMSA-Mobile/`)
- **React Native** with **Expo**
- **TypeScript**
- React Navigation (Native Stack + Bottom Tabs)
- Axios for API calls
- AsyncStorage for token/user/schoolCode persistence
- Push notifications via Expo Notifications
- Production API: `https://amsa-learning-management-system-production.up.railway.app/api`

### Backend (`backend/`)
- **Node.js + Express.js** (v5)
- **MongoDB** with Mongoose ODM
- **JWT** authentication (7-day expiry)
- **Upstash Redis** for caching
- **AWS S3** (`af-south-1`) for notes PDF storage
- **Expo Server SDK** for push notifications
- **node-cron** for scheduled jobs
- **bcryptjs** for password hashing
- Deployed on **Railway**

### Admin Web Panel (`react-admin-tutor-web/`)
- **React 19** with **Vite**
- **Material UI (MUI) v5**
- Axios + React Router DOM
- Theme: primary `#E23724` (AMSA red), secondary `#007B8C` (teal)

---

## Current AMSA Features (Built & Working)

### Mobile — Student Screens (Bottom Tabs)
- **Dashboard** — stats cards, today's classes with swipe-to-check-in, recent activity
- **Notes** — PDF library, searchable/filterable by subject
- **Marks** — test results by subject with grade calculation
- **Attendance** — monthly attendance history
- **Profile** — password change, logout
- **Calendar** (modal) — month view of scheduled classes
- **ClassDetails** (modal) — class info + geofenced check-in/check-out

### Mobile — Parent Screens (Bottom Tabs)
- **Dashboard** — children summary, quick actions, recent marks activity
- **Children** — list of linked children with grade/subjects
- **Marks** — all children's marks grouped by student
- **Profile** — account settings

### Backend API Routes
```
POST   /api/auth/login
PUT    /api/auth/push-token
POST   /api/auth/change-password

GET    /api/students/me
GET    /api/students/marks
GET    /api/students/notes
GET    /api/attendance/my-attendance
POST   /api/attendance/classes/:id/check-in
POST   /api/attendance/classes/:id/check-out
GET    /api/schedules
GET    /api/schedules/upcoming
GET    /api/schedules/:classId

GET    /api/parents/me
GET    /api/parents/me/children
GET    /api/parents/me/marks
GET    /api/parents/me/attendance

GET    /api/academic/config

GET    /api/admin/students
POST   /api/admin/students
PUT    /api/admin/students/:userId       ← RECENTLY ADDED
GET    /api/admin/tutors
POST   /api/admin/tutors
GET    /api/admin/parents
POST   /api/admin/parents
PUT    /api/admin/parents/:userId        ← RECENTLY ADDED
GET    /api/admin/admins                 ← RECENTLY ADDED
POST   /api/admin/admins                 ← RECENTLY ADDED
PUT    /api/admin/admins/:userId         ← RECENTLY ADDED
DELETE /api/admin/users/:userId
GET    /api/admin/marks
PUT    /api/admin/marks/:markId
DELETE /api/admin/marks/:markId
PUT    /api/admin/school-config
GET    /api/school-config
```

### Admin Web Panel Pages (All Built)
- `/admin/dashboard` — stats: student count, tutor count, total classes, today's classes
- `/admin/students` — create, **edit** ✅, delete students
- `/admin/tutors` — create, delete tutors
- `/admin/parents` — create, **edit** ✅, delete, link to students
- `/admin/admins` — **NEW** ✅ create, edit, delete admins (cannot delete self)
- `/admin/schedules` — create/cancel class schedules with auto-assign students
- `/admin/attendance` — view attendance records, filter, CSV export
- `/admin/marks` — view/delete marks with grade/subject filters
- `/admin/school-config` — geofencing map (Leaflet), WiFi IPs, attendance buffer settings

---

## MongoDB Models

```javascript
User: {
  name, email, password (hashed), role (admin|tutor|student|parent),
  pushToken, timestamps
}

Student: {
  user → User, grade (8-12), subjects [], parents [] → User, timestamps
}

Tutor: {
  user → User, subjects [], grades [], timestamps
}

Mark: {
  student → Student, tutor → Tutor, subject, grade,
  testName, score, total, timestamps
}

Attendance: {
  class → ClassSchedule, student → Student,
  status (absent|present|late|excused|left_early),
  checkIn: { time, location{lat,lng}, verifiedByLocation, deviceId },
  checkOut: { time, location }, duration (minutes), timestamps
}

ClassSchedule: {
  tutor → Tutor, subject, grade, title, description,
  scheduledDate, startTime, endTime, students [] → Student,
  status (scheduled|ongoing|completed|cancelled),
  room, meetingLink, timestamps
}

Notification: {
  recipient → User, recipientType, title, message,
  type (class_reminder|check_in_available|announcement|attendance_alert|general),
  data (Map), read, readAt, priority, timestamps
}

Note: {
  title, description, fileUrl (S3), tutor → Tutor, subject, grade, timestamps
}

SchoolConfig: {
  schoolName, address, geofence, wifiIps,
  checkInBuffer, checkOutBuffer, autoMarkAbsent
}
```

### Academic Config (`backend/config/academicConfig.js`)
```javascript
PREDEFINED_GRADES:   [8, 9, 10, 11, 12]
PREDEFINED_SUBJECTS: [
  "Natural Sciences", "Mathematics", "Mathematical Literacy",
  "Physical Sciences", "Business Studies", "English",
  "Agricultural Sciences", "Geography", "Life Sciences", "Accounting"
]
```

---

## Auth Middleware Output

After `authenticate` middleware runs, `req` contains:
```javascript
req.user      // full User document (minus password)
req.userId    // User._id (ObjectId)
req.role      // "admin" | "tutor" | "student" | "parent"
req.studentId // Student._id — only populated if role === "student"
req.tutorId   // Tutor._id  — only populated if role === "tutor"
```

Login response shape (stored in AsyncStorage as `user`):
```javascript
{ id, roleId, name, email, role }  // note: "id" not "_id"
```

---

## Environment Variables (`backend/.env`)

```
MONGO_URI=mongodb+srv://...
PORT=5000
JWT_SECRET=...
JWT_EXPIRES_IN=7d
NODE_ENV=development

UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...

AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=af-south-1
AWS_BUCKET_NAME=amsanotesbucket

EXPO_ACCESS_TOKEN=...

DEFAULT_CHECK_IN_BUFFER=15
DEFAULT_CHECK_OUT_BUFFER=15
AUTO_MARK_ABSENT_ENABLED=true

SCHOOL_LATITUDE=-26.2041
SCHOOL_LONGITUDE=28.0473
SCHOOL_GEO_RADIUS=200
GEO_FENCING_ENABLED=true

# To be added:
DEEPSEEK_API_KEY=        ← for AI chatbot + weekly reports
SUPER_ADMIN_KEY=         ← for Funza super admin panel (Funza only)
```

---

## Key File Paths

### Backend
```
backend/
├── server.js                          ← route registration, middleware setup
├── .env                               ← all secrets
├── controllers/
│   ├── adminController.js             ← student/parent/tutor/admin CRUD
│   ├── authController.js              ← login, password change
│   ├── studentController.js
│   ├── parentController.js
│   ├── scheduleController.js
│   └── attendanceController.js
├── models/
│   ├── user.js, student.js, tutor.js
│   ├── mark.js, attendance.js
│   ├── classSchedule.js, notification.js, notes.js, schoolConfig.js
├── middleware/
│   ├── authMiddleware.js              ← sets req.user/userId/role/studentId/tutorId
│   └── cacheMiddleware.js             ← Redis caching + invalidation
├── routes/
│   ├── adminRoutes.js                 ← all admin/* routes
│   ├── authRoutes.js, studentRoutes.js, parentRoutes.js
│   └── scheduleRoutes.js, attendanceRoutes.js, notificationRoutes.js
└── config/
    └── academicConfig.js              ← PREDEFINED_GRADES, PREDEFINED_SUBJECTS
```

### Mobile
```
AMSA-Mobile/
├── App.tsx                            ← navigation root, role-based routing
├── app.json                           ← app name, expo config
├── src/
│   ├── context/AuthContext.tsx        ← user state { id, name, email, role }
│   ├── services/
│   │   ├── api.ts                     ← axios instance, base URL, Bearer token header
│   │   ├── auth.ts                    ← login/logout/AsyncStorage
│   │   ├── student.ts                 ← all student API calls
│   │   └── parent.ts                  ← all parent API calls
│   ├── components/
│   │   ├── theme.ts                   ← BRAND colors { red, yellow, teal, blue, bg, surface }
│   │   ├── GlassCard.tsx              ← reusable card with glassmorphism
│   │   ├── BouncingDotsLoader.tsx     ← loading animation (3 bouncing dots)
│   │   └── layout.ts                  ← TAB_BAR_HEIGHT, TAB_BAR_BOTTOM_OFFSET
│   ├── screens/
│   │   ├── student/
│   │   │   ├── DashboardScreen.tsx
│   │   │   ├── NotesScreen.tsx
│   │   │   ├── MarksScreen.tsx
│   │   │   ├── AttendanceScreen.tsx
│   │   │   ├── ProfileScreen.tsx
│   │   │   ├── CalendarScreen.tsx
│   │   │   └── ClassDetailsScreen.tsx
│   │   └── parent/
│   │       ├── DashboardScreen.tsx
│   │       ├── ChildrenScreen.tsx
│   │       ├── MarksScreen.tsx
│   │       └── ProfileScreen.tsx
│   ├── types/
│   │   ├── index.ts                   ← User, Note, Mark, Attendance types
│   │   └── navigation.ts              ← RootStackParamList
│   └── utils/
│       └── formatting.ts              ← calculateGrade, getSubjectColor, formatTime
```

### Admin Web
```
react-admin-tutor-web/src/
├── App.jsx                            ← all routes, ProtectedRoute wrappers
├── pages/Admin/
│   ├── AdminDashboard.jsx
│   ├── ManageStudents.jsx             ← includes edit dialog
│   ├── ManageTutors.jsx
│   ├── ManageParents.jsx              ← includes edit dialog + link parent dialog
│   ├── ManageAdmins.jsx               ← NEW — full CRUD for admin accounts
│   ├── ManageSchedules.jsx
│   ├── ManageMarks.jsx
│   ├── ClassAttendance.jsx            ← with CSV export
│   └── SchoolConfig.jsx               ← Leaflet map geofencing
├── components/layout/
│   ├── Sidebar.jsx                    ← nav links (includes Manage Admins)
│   └── Layout.jsx
└── services/
    ├── apiService.js                  ← axios instance + auth interceptor
    ├── academicService.js             ← subjects/grades config
    └── marksService.js                ← marks CRUD
```

---

## Planned Features (Not Yet Built — AMSA First, Then Funza)

### 1. AI Chatbot (DeepSeek-V3)
**Cost:** ~$3–8/month light usage for 150 students

**Who:** Students (academic Q&A + personal data), Parents (child progress), Admins (school stats)
**Where:** Mobile app new Chat tab + Admin web new AI Assistant page

**Backend:**
- `POST /api/chat` — authenticate → build role-specific system prompt with live data → call DeepSeek → return `{ reply }`
- Student context: grade, subjects, recent marks, upcoming classes, attendance rate
- Parent context: children names, grades, attendance rates, recent marks
- Admin context: school stats (student count, today's classes, etc.)
- DeepSeek-V3 model: `deepseek-chat` at `https://api.deepseek.com/v1`
- Plain text math notation (x^2 not LaTeX)
- ⚠️ **POPIA constraint (see Decision Refinement #3):** prompts must be PII-stripped — no learner names/emails/IDs sent to the provider; provider must sit behind a swappable `aiProvider` module.

**New files:**
```
backend/controllers/chatController.js
backend/services/aiProvider.js         ← provider abstraction (DeepSeek today, swappable)
backend/routes/chatRoutes.js
AMSA-Mobile/src/services/chat.ts
AMSA-Mobile/src/screens/student/ChatScreen.tsx
AMSA-Mobile/src/screens/parent/ChatScreen.tsx
AMSA-Mobile/App.tsx                    ← add Chat tab to both navigators
react-admin-tutor-web/src/pages/Admin/AdminChat.jsx
```

---

### 2. Student Activity Tracking
**Cost:** Free — pure MongoDB, no external API

**Events tracked (fire-and-forget, never blocks UI):**
- `app_open` — student foregrounds app
- `app_close` — student backgrounds app (+ session duration in seconds)
- `screen_view` — student navigates to tab (Notes/Marks/Attendance/Chat)
- `note_view` — student opens a note
- `chat_message` — student sends AI message (count only)

**New MongoDB model:**
```javascript
ActivityLog: { student→Student, sessionId(UUID), eventType, screen, duration, timestamp }
```

**New API routes:**
```
POST /api/activity/log                 ← student logs event (204 No Content)
GET  /api/activity/admin               ← admin analytics (last active, sessions/week, hours/week, streak)
GET  /api/activity/parent/children    ← per-child summary for parent
```

**Admin web:** New `StudentActivity.jsx` page — table with last active, sessions/week, hours/week, streak, most used screen, color-coded status (green=active today, yellow=2-3 days, red=4+ days)

**Parent mobile:** `ChildrenScreen.tsx` updated — each child card shows "Last active: Today 14:30" + "This week: 3.5hrs · 6 sessions"

**Mobile tracking (App.tsx):**
- `AppState.addEventListener` → `app_open`/`app_close`
- Navigation tab listener → `screen_view`
- Session UUID generated once per app launch, stored in module scope

**New files:**
```
backend/models/activityLog.js
backend/controllers/activityController.js
backend/routes/activityRoutes.js
AMSA-Mobile/src/services/activity.ts
react-admin-tutor-web/src/pages/Admin/StudentActivity.jsx
```

---

### 3. Weekly AI Parent Reports
**Cost:** ~R500/month extra (150 DeepSeek calls/week × ~2,500 tokens)
**Schedule:** Every Friday at 18:00 (`node-cron`: `'0 18 * * 5'`)

**What the report covers:**
- App usage this week: days logged in, total study hours, sessions, features used
- Class attendance: present/absent/late counts with specific details (e.g. "arrived late to Mathematics on Tuesday")
- Recent marks per subject
- AI-generated: what went well, any concerns, 2 practical tips for parent

**Delivery:**
- Stored as `Notification` (extend type enum with `weekly_summary`) — viewable in parent app
- Push notification sent to parent's device via Expo: "📊 Weekly report for [child name] — tap to read"

**Attendance data from existing model:**
```javascript
Attendance.find({ student, createdAt: { $gte: weekStart } })
  .populate('class', 'subject scheduledDate startTime')
// Gives: present count, late count (with subject+date), absent count, left_early count
```

**Parent mobile:** New `WeeklyReportScreen.tsx` — full scrollable report text. Replaces "Messages (Coming Soon)" placeholder in parent dashboard Quick Actions.

**New files:**
```
backend/jobs/weeklyReport.js           ← cron job
backend/models/notification.js         ← add 'weekly_summary' to type enum
AMSA-Mobile/src/screens/parent/WeeklyReportScreen.tsx
```

---

### 4. QR-Code Register Signing — Class Registers (Student QR Cards + Staff Scanner)

**Status:** Planned. This is the foundation the gate-card feature (#6) extends.

Each student gets a **printable QR code card** (generated on the admin web side, individually or in bulk per grade). On mobile, **admins and tutors** get a scanner section: pick a class session, scan students' printed QR codes — each scan flashes the student's name + profile photo for ~10s and marks them present on that class's register. Non-enrolled students rejected with a clear message.

**Key design points:**
- QR payload: originally `AMSA-STUDENT:<Student._id>` — **supersede with `cardId` (see feature #6) before shipping** so one card serves class + gate registers and lost cards are revocable
- Dedicated scan endpoint `POST /api/attendance/classes/:classId/scan` (staff JWT required; tutor restricted to own classes): validates payload → checks enrollment → marks present with `verificationMethod: 'qr'` → returns `{ student: {name, grade, profilePictureUrl}, alreadyMarked }` for the overlay. Duplicate scan = 200 with `alreadyMarked: true`, not an error
- Requires server-side **profile photos** (new: `User.profilePicture`, S3 folder `profile-pictures/`, upload endpoints for self + admin) so the scanner overlay shows a real photo
- Web printing: `qrcode.react` + `window.print()` on a Layout-free route with `@media print` CSS (browser print dialog makes the PDFs)
- Mobile scanner: `expo-camera` `CameraView` (QR only), scan lock via `useRef` (fires every frame), overlay states: success / already-marked / not-enrolled / error, 10s auto-dismiss + tap-to-dismiss
- Staff roles need mobile app routing (a `StaffStackNavigator`: class picker → scanner) — admins/tutors currently can't use the mobile app at all
- ⚠️ `expo-camera` is a new native module → new EAS dev build required

**Build order:** backend (photos + scan endpoint) → web printing & mobile scanner in parallel → end-to-end with a real printed sheet.

---

### 5. Intelligence-Tier Extras (Beyond the Chatbot)

**Status:** Idea (2026-07-18) — these make the R59 vs R29 gap feel obvious, and all run on data already collected (Attendance, Mark, ActivityLog).

#### 5a. Early-warning flags ("know which kid is sliding before the term report")

The feature principals actually buy. A weekly cron scores every student over the trailing fortnight:

- **Attendance dip** — absent/late rate vs the student's own prior baseline
- **Marks drop** — recent average vs prior term/period average per subject
- **App inactivity** — no `app_open` events in N days (from ActivityLog)

Two or more signals firing together → flag. **v1 is pure rules — no AI cost.** An AI-written one-paragraph summary per flagged student is an optional polish.

- New model: `StudentFlag { student, period, signals: [], severity, resolved, notes }`
- Admin web: dashboard widget + `AtRiskStudents.jsx` page (flag list, severity color, resolve/annotate)
- Parent: optional push — "We've noticed [child]'s attendance has dipped recently" (tone matters; admin can review before it goes out)
- Cron: weekly, before the Friday parent reports so reports can reference active flags

#### 5b. Tutor report-comment assist

AI drafts termly report-card comments from each student's marks + attendance; the tutor edits and approves — never auto-published. Teachers hate writing these; this alone can sell the tier to staff.

- Depends on the terms/report-card data model (Gap 3) — build after terms exist
- Tutor web: on the report-card editing view, per-student "Draft comment" button → editable text field
- POPIA rule applies (Refinement 3): prompt carries marks/attendance stats only, no learner name; name is templated in after the AI call

#### 5c. Admin "ask your data"

The planned admin AI chat, but pitched and built as natural-language queries over the school's own data: "Which Grade 10s have missed Maths twice this month?", "Average Physical Sciences mark this term vs last?"

- Implementation: function-calling over a whitelist of existing queries (attendance aggregates, marks aggregates, activity summaries) — the AI never gets raw DB access; it picks a query + parameters, the backend runs it tenant-scoped
- Falls out of `chatController.js` + `aiProvider.js` once those exist; the query-tool whitelist is the new work

---

### 6. Student ID Cards — Gate Register Signing (No-Phone Schools)

**Status:** Idea (2026-07-18) — motivated by Funza: many fee-paying schools **ban phones**, so self-service check-in (geofence/WiFi) is impossible for them. Every student gets a unique physical card; scanning it at the gate signs the daily register automatically. Builds directly on the QR-card printing + scanner infrastructure in feature #4.

#### Context

This is the **daily (morning) register** — the legally required one in SA schools — which is distinct from per-class attendance. A gate scan says "this learner arrived at school at 07:12", not "attended Maths". The class scanner (feature #4) still covers class registers. Side benefit that may sell harder than the register itself: an instant parent push — "✅ Thandi arrived at school 07:12" — is a safety feature parents love, and it costs nothing extra.

#### Key design decisions

- **Card payload: a revocable `cardId`, not `Student._id`.** Add `cardId` (random ~10-char base32, unique index) to Student. QR payload `FUNZA-CARD:<cardId>` (or the raw cardId for RFID). Reporting a card lost = regenerate `cardId`, reprint — the old card is instantly dead. This matters for gate registers because the threat isn't forgery (staff/kiosk auth gates the endpoint), it's **buddy-scanning with a lost/borrowed card**. Use `cardId` in the class-scanner feature too, so one card serves both.
- **New `DailyAttendance` model** — don't overload the per-class `Attendance`:
  ```javascript
  DailyAttendance: {
    student → Student, date (YYYY-MM-DD),
    checkIn: { time, method: 'card'|'manual' }, checkOut: { time },
    status: 'present'|'late', timestamps
  }
  // unique compound index (student, date) — dedupes multi-lane scanning for free
  ```
  Late = check-in after a cutoff in SchoolConfig (e.g. 07:45); cutoffs per school (per-tenant config in Funza).
- **One endpoint, many scanners:** `POST /api/attendance/gate-scan` `{ payload }` — auth'd (admin/tutor, or a scoped **gate-operator** token so a security guard's device never holds admin rights). Resolves cardId → student, upserts DailyAttendance, returns `{ student: { name, grade, profilePictureUrl }, status, alreadyScanned }`. Scans after a configurable afternoon time (or with an explicit mode toggle) record **check-out** instead → "left school 14:35" parent push.
- **The hardware insight: USB barcode/QR scanners AND USB RFID readers are both HID keyboard emulators.** They "type" the scanned code + Enter into whatever is focused. So one fullscreen admin-web page with an always-focused invisible input supports every hardware tier with zero driver work.

#### Hardware tiers (all hit the same endpoint — schools choose by budget)

| Tier | Hardware | Cost | Throughput | Notes |
|---|---|---|---|---|
| 1. Staff phone | Existing mobile scanner app, new "Gate register" mode (no class picker) | R0 | ~5–8/min | Fine for small schools; reuses the feature #4 scanner screen |
| 2. Web Gate Mode + USB QR/barcode scanner | Any laptop + handheld scanner | ~R500–900/scanner | ~30/min | The sweet spot; scanner types into the Gate Mode page |
| 3. RFID/NFC tap cards + USB reader | 13.56 MHz **NTAG213/215** cards + USB reader | ~R10–20/card, reader ~R300–600 | ~60/min (1s tap) | Card UID stored as the student's `cardId`; same Gate Mode page unchanged. Durable, works in rain/dark, feels professional. Sell printed photo-ID cards as a per-card service fee |
| **3b. Staff phone as NFC reader** ("Apple Pay, flipped") | Same NFC cards + any NFC Android phone — **no reader hardware at all** | ~R10–20/card, R0 reader (or ~R1,500–2,500 for a dedicated cheap Android) | ~30–60/min on Android; slower on iPhone (system scan sheet per tap) | `react-native-nfc-manager` in the staff app; card UID = `cardId`; portable — gates, sports days, excursions, exam venues |
| 4. Multi-lane | N× tier 2/3/3b stations | linear | 800 learners in ~15 min with 2–3 lanes | Unique (student, date) index makes concurrent lanes safe |

#### Phone as NFC reader (tier 3b detail) — **the recommended default: one Android phone + a box of blank NFC cards**

The tap-to-pay mental model, with the roles right: the **security guard's phone is the payment terminal** (reader mode), the **student's card is the bank card** (passive **NTAG213/215**, no battery). Students tap their cards on the back of the phone, ~1–2s each. No USB readers, no laptop, no printing.

- **Blank cards work day one — printing is optional.** Plain white **NTAG213/215** cards (~R8–15) or NFC **wristbands/keyfobs** (harder to lose, washing-machine-proof). Nothing is written or printed on the card, ever. **Card type matters:** NTAG213/215 only — avoid "MIFARE Classic" listings (often the cheapest); Classic's proprietary protocol fails on some Android phone chipsets.
- **Enrollment is a tap:** "Issue card" mode in the staff app — pick the student, tap a blank card, its factory UID is saved as that student's `cardId`. Hand it over, done. Lost card → tap a new blank one; the old UID dies instantly.
- **Anti-buddy-scanning needs no printed photo:** the guard's phone flashes the student's **name + photo on-screen** at every tap — the guard glances at the screen, not the card. Printed photo-ID cards stay an optional upsell (schools like them as ID cards), not a requirement.
- **Library:** `react-native-nfc-manager` (Expo config plugin exists, but native module → EAS dev build). Add it to the **same EAS build as `expo-camera`** — one build covers class scanner + gate QR + NFC.
- **Platform caveat — iPhones CAN read NFC cards, but with worse gate UX:** Core NFC (iPhone 7+) reads tags fine, including multiple taps per session via restartPolling. But (1) reading only works inside Apple's system "Ready to Scan" sheet, which covers half the screen and can't be replaced with our full-screen name+photo flash, and (2) sessions time out after ~60s, so the operator re-starts scanning every minute. Fine for a class of 25; miserable for an 800-learner gate queue. Android reader mode has no sheet, no timeout, and full custom UI — **gate device = a cheap Android phone; staff iPhones are fine for classroom-sized NFC scanning.**
- **Optional hybrid:** printing the QR on the card's face additionally enables phone-camera QR (fallback) and the USB-reader tier. Same `gate-scan` endpoint regardless; the payload is just UID vs QR string.

#### Digital card — student phone as the card, no printing (phone-allowed schools only)

For schools that **allow** phones, skip printing entirely: the "card" lives in the student app.

- **"My Card" screen** in the student app: full-brightness QR the student shows at the gate; staff phone scans it with the same camera scanner built for class registers (feature #4). Boarding-pass/gym-check-in pattern — works on every phone, zero hardware, zero printing.
- **Anti-screenshot:** a static QR could be screenshotted and shared ("scan me in, I'm bunking"). The QR embeds a rotating TOTP-style token — `FUNZA-DIGI:<studentId>:<6-digit code>` — regenerated every ~60s **offline** from a per-student seed (issued at login, stored on device), so it works with no signal at the gate but a screenshot dies within a minute. Server verifies the token with a ±1-window tolerance. Photo flash on the scanner stays as the second check.
- **Why NOT phone-tap-phone NFC (the tap-to-pay pattern):** tap-to-pay = the customer phone *emulating a card* (Host Card Emulation). Android apps can do HCE; **Apple locks card emulation to Apple Pay/Wallet** — third-party apps can't emulate (EU carve-outs don't help in SA). Phone-tap-phone would silently exclude every iPhone student, and RN HCE libraries are fragile community ports. Rejected — screen QR does the same job universally.
- **Fits as per-school config**, not a card replacement: phones-allowed schools → digital card (or existing geofence/WiFi self-check-in); phones-banned schools → printed QR/NFC cards. Same `gate-scan` endpoint everywhere; the digital payload is just one more format to parse.

#### Web: `GateRegister.jsx` (the core build)

- Fullscreen, `noLayout` route (same pattern as the QR print page), giant status flash per scan: green name+photo+time / yellow "already scanned 07:12" / red "unknown card" — readable from metres away, with a running count for the morning
- Hidden always-focused `<input>` captures HID keyboard scans (refocus on blur); Enter submits
- **Offline tolerance** — gates have bad WiFi: queue failed posts in localStorage with the scan timestamp, retry banner ("3 scans pending"), flush when connectivity returns; server honors the client timestamp for late/present status
- Check-in / check-out mode toggle + auto-switch time

#### Card printing

- Extend the feature #4 QR print page into a proper **ID-card layout**: school logo + primary color (tenant branding in Funza), student photo, name, grade, QR — credit-card size, print-and-laminate, or export for a card-printing bureau
- "Reissue card" action on `ManageStudents.jsx` row: regenerates `cardId`, opens the single-card print view

#### Implementation: connecting NFC cards to the app

The chip's factory UID (a hex string, e.g. `04A3B2C1D80000`) is the entire integration — nothing is ever written to the card.

1. **Mobile native module:** `npx expo install react-native-nfc-manager` + its config plugin in `app.json` (`nfcPermission` message). Native module → **EAS dev build**, bundled with `expo-camera` (one build covers QR + NFC). ⚠️ Buy **NTAG213/215** cards, NOT "MIFARE Classic" — Classic's proprietary protocol fails on some Android chipsets.
2. **Reading:** Android = continuous reader mode (`NfcManager.setEventListener(NfcEvents.DiscoverTag, …)` + `registerTagEvent()` — fires per tap, no UI takeover). iOS = one session per tap (`requestTechnology(NfcTech.NfcA)` → `getTag()`, shows Apple's sheet). Normalize UIDs once (uppercase, no separators) — it's the primary key of the card system.
3. **Backend:** `Student.cardId: { type: String, default: null, index: { unique: true, sparse: true } }`. Endpoints: `POST /admin/students/:studentId/card { uid }` (409 with the other student's name if UID already linked; overwrite-on-relink = lost-card reissue) and `DELETE .../card` (unlink). `gate-scan` resolves `Student.findOne({ cardId: uid })`.
4. **Screens (staff navigator):** `IssueCardScreen` — pick student → "tap a blank card" → link → success flash → hand over. `GateScanScreen` — same listener → `POST gate-scan` → full-screen photo/name/status flash (~2s) → re-arm.
5. **Gate realities:** debounce repeat reads (same UID ignored ~3s — a held card fires repeatedly); queue failed posts locally with the tap timestamp (gate WiFi is bad) and retry in background.
6. **Build order:** backend first (curl-testable with no hardware) → EAS build → screens → ~R200 of NTAG213 cards for a real-phone end-to-end test.

#### Keeping cards personal (avoiding mix-ups)

The **system** can never confuse cards — every NFC chip has a factory-burned, globally unique UID, linked to exactly one student at issue time. The risk is **humans** mixing up identical-looking blank cards. Layered fixes, free → fancy:

1. **Issue one-at-a-time:** enrollment flow forces pick student → tap → hand over *now* — no pre-linked batch lying around to shuffle
2. **"Whose card is this?" mode** in the staff app: tap any card → owner's name + photo. Mix-ups self-correct; lost-and-found becomes trivial
3. **Cheap labels:** marker or sticker with name + grade; admin web generates an **A4 sticker-sheet PDF** in issue order. Color-coded cards/lanyards per grade shrink the mix-up pool for free
4. **Photo flash at the gate is the safety net:** a swapped card shows the owner's face → caught on the spot → reissue both
5. **Printed photo-ID cards** = premium tier; visibly personal, doubles as school ID
- **Don't** write the student's name onto the chip (NTAG is writable): any stranger's phone could then read a child's name off a found card — POPIA smell for zero benefit over the app-only identify mode

#### Anti-buddy-scanning

- Photo on the card + photo flash on the Gate Mode screen — the operator glances, that's the check
- Lost card → reissue kills the old `cardId` immediately
- Optional: flag statistically odd patterns later (e.g. two cards always scanned in the same second) — not v1

#### Sequencing

1. `cardId` on Student + gate-scan endpoint + `DailyAttendance` model (small backend job)
2. `GateRegister.jsx` web page — this alone serves hardware tiers 2–4
3. ID-card print layout (extends the QR-card printing in feature #4)
4. Parent arrival/departure push notifications
5. Mobile "Gate register" mode on the staff scanner screen (tier 1) — cheap once the class scanner exists
6. RFID enrollment flow (scan card UID into `cardId` when issuing) — only when a school asks

---

## Funza Multi-Tenant Architecture

### Core Concept
One backend server handles all schools. Each school has its own MongoDB database. The tenant middleware reads the school from the JWT and connects to the correct database. All existing controllers run unchanged — they just operate on whichever database the middleware connected to.

> ⚠️ **Refined 2026-07-18** — same design, but school databases live on **one cluster** selected via `useDb()`, not per-school connection strings. See Decision Refinement #1.

### New Backend Files (Funza only)
```
backend/models/masterSchool.js
  { name, slug, dbName, logoUrl, primaryColor, tier, active, unlisted,
    subscriptionStatus (trial|active|grace|suspended), studentCount,
    dedicatedUri (null unless a client needs an isolated cluster) }
  ← stored in a separate MASTER database, not in any school's database

backend/middleware/tenantMiddleware.js
  ← reads schoolCode from the JWT claim (x-school-code header used only pre-login)
  ← finds school in master DB → req.schoolDb = masterConn.useDb(school.dbName, { useCache: true })
  ← rejects requests where header and JWT claim disagree

backend/routes/schoolRegistryRoutes.js
  GET /api/schools          ← public, no auth — returns listed schools for selection screen
  GET /api/schools/:slug    ← public — returns one school's public info (works for unlisted too — this is the join-by-code path)

backend/routes/superAdminRoutes.js
  ← protected by SUPER_ADMIN_KEY env var (not a user login)
  POST   /api/super-admin/schools      ← provision new school
  GET    /api/super-admin/schools      ← all schools with student counts
  PUT    /api/super-admin/schools/:slug ← update branding/tier/status/subscription
```

### New Mobile Files (Funza only)
```
src/screens/SchoolSelectionScreen.tsx
  ← first screen before login
  ← searchable list from GET /api/schools + "enter school code" input for unlisted schools
  ← saves selected schoolCode + config to AsyncStorage + SchoolContext

src/context/SchoolContext.tsx
  ← provides { slug, name, logoUrl, primaryColor, tier } to entire app
  ← primaryColor replaces hardcoded BRAND.red throughout the app

src/services/schools.ts
  ← getSchools() and getSchool(slug)

src/services/api.ts  (modify)
  ← add x-school-code header to every request
```

### Funza Navigation Flow
```
App opens
  → check AsyncStorage for saved schoolCode
  → if none:    SchoolSelectionScreen → pick school (or enter code) → LoginScreen
  → if saved:   LoginScreen (school branding already loaded)
  → if logged in: StudentApp / ParentApp (same as AMSA)
```

### Onboarding a New School
1. Platform owner logs into Super Admin panel
2. Adds school: name, slug, logo URL, primary color, tier (Core/Intelligence) — DB provisions itself on first write (no MongoDB URI to manage)
3. School immediately appears in mobile app's selection screen (unless `unlisted`)
4. School admin runs the setup wizard: grades/subjects/terms → invite tutors → **CSV bulk-import students & parents**
5. Students activate accounts via printed activation/QR cards (see Gap Fix #2) → open Funza → select school → login

### Super Admin Web Panel (Funza only)
```
react-admin-tutor-web/src/pages/SuperAdmin/
  SuperAdminDashboard.jsx   ← all schools overview, total students, revenue summary
  SchoolManagement.jsx      ← add/edit schools, set tier, upload logo, color picker,
                              subscription status control (trial/active/grace/suspended)
```

---

## Key Decisions Already Made

| Topic | Decision |
|---|---|
| AI provider | DeepSeek-V3 (`deepseek-chat`) — cheap, good quality — **refined: PII-stripped + swappable, see Refinement #3** |
| AI for math reasoning | DeepSeek-R1 option if needed |
| Multi-tenancy approach | Database-per-school (not schoolId field in shared DB) — **refined: one cluster + `useDb()`, see Refinement #1** |
| School identification on mobile | School selection screen (searchable list) + join-by-code for unlisted schools |
| Branding per school | Custom logo + primary color, loaded from server after school selection |
| Pricing model | Per student per month |
| Funza Core price | R29/student/month |
| Funza Intelligence price | R59/student/month |
| Minimum billing | 20 students per school |
| Target market | Fee-paying secondary schools Grade 8–12 South Africa |
| Sales strategy | Start with private schools → Q5 public → Q4 public |
| Business structure | Family Trust → (Pty) Ltd |
| Implementation order for AMSA | 1. Activity Tracking → 2. AI Chatbot → 3. Weekly Reports |
| PDF notes in AI context | NOT included in every message — fetch on demand when student asks |
| Weekly report schedule | Friday at 18:00 (cron: `'0 18 * * 5'`) |
| Math formatting in AI | Plain text only (x^2 not LaTeX) — mobile can't render LaTeX |

---

## Decision Refinements (2026-07-18)

Three decided items, kept in spirit but adjusted in implementation to avoid known traps.

### Refinement 1 — Database-per-school via `useDb()` on ONE cluster (not per-school mongoUri)

**Problem with per-school connection strings:** each `mongoose.createConnection()` opens its own socket pool (~10 connections default). At 100 schools that's ~1,000 open connections — past Atlas limits on smaller tiers. Separate clusters also mean N× migration runs, N× monitoring, and connection secrets stored in the master DB.

**Fix (keeps the exact same isolation + middleware design):**
- One Atlas cluster, one master connection.
- `tenantMiddleware` resolves: `req.schoolDb = masterConnection.useDb('funza_' + school.slug, { useCache: true })` — shares the single socket pool, cached per school.
- `masterSchool.mongoUri` → replaced by `dbName` (derived from slug). Keep an optional `dedicatedUri` field, null by default, so a future whale client demanding an isolated cluster is a config change, not a rewrite.
- Provisioning a school becomes **instant and free** — the database materializes on first write; no Atlas API calls, no secrets.
- The per-school-database story is preserved for POPIA/sales conversations ("your school's data lives in its own database").

### Refinement 2 — Don't duplicate the codebase; AMSA becomes school #1

**Problem:** "separate repo, port features across" means every AMSA bugfix is ported by hand, forever. The codebases drift until porting = rewriting.

**Fix:**
- Build `tenantMiddleware` **into this repo**. AMSA's current database becomes tenant `amsa` in the master registry. "Funza" is a deployment + branding config, not a second codebase.
- Mobile: one codebase. The AMSA app is a build with a **pinned schoolCode** (skips SchoolSelectionScreen, ships AMSA branding) via Expo build profiles / app config. The Funza app is the same code with selection enabled.
- If separate repos are non-negotiable for business reasons, share the **backend** at minimum — it's where all the drift risk lives.

### Refinement 3 — POPIA-safe AI: PII-stripped prompts + swappable provider

**Problem:** learners are children — POPIA treats children's personal information as special-category (competent-person consent, ss. 34–35), and sending it cross-border (s. 72) to China-hosted DeepSeek is a hard question from exactly the private-school governing bodies targeted first.

**Fix:**
- **Never send PII to the AI provider.** Prompts carry role + grade + subjects + marks + attendance stats — no names, emails, or IDs. Names are re-inserted client-side / server-side after the AI call where needed (e.g. weekly reports templated as "your child" then personalized on delivery).
- All AI calls go through one module (`backend/services/aiProvider.js`). DeepSeek today; a school or regulator demanding different data residency = config change.
- Write a **one-page data-processing summary** (what's collected, where it's stored — af-south-1 S3, per-school DB — what reaches the AI provider, deletion on request). This document is a sales asset: "POPIA-ready" will close deals the chatbot alone won't.

---

## Gap Fixes & Recommendations (2026-07-18)

Things the plan needs that weren't covered anywhere yet.

### Gap 1 — Billing operations (pricing is decided; nothing implements it)
- **Subscription state machine** on `masterSchool`: `trial → active → grace → suspended`. Suspended = **read-only mode** (students/parents can still view; nothing new can be captured) — humane and very effective.
- **Active-student snapshot** on the 1st of each month (cron over all schools) → drives the invoice: `max(activeStudents, 20) × tierPrice`.
- **Payment rails:** SA schools pay by EFT/debit order, not credit card. Use **Netcash or Sage** debit orders + generated PDF invoices — not Stripe.

### Gap 2 — Onboarding at school scale (800 learners can't be typed in by hand)
- **CSV/Excel bulk import** of students + parents (every school can export this from SA-SAMS or their admin system). Import wizard with column mapping + dry-run preview. This is the make-or-break onboarding feature.
- **Credential distribution:** printed **activation cards** — one per student, carrying a one-time activation code (and doubling as the QR/ID card, see FEATURES.md gate-card entry). Student enters/scans code in the app → sets their own password. No distributing 800 passwords.
- **Setup wizard** for the school admin: grades → subjects → terms → invite tutors → import students.

### Gap 3 — CAPS-shaped academics (the biggest tutoring-academy → real-school gap)
- `Mark` needs `term`, `assessmentType` (SBA task / exam), and `weighting`; schools will ask for **term report cards (PDF export)** as roughly their first question.
- `academicConfig.js` must become **per-tenant config** — a school offering Tourism or CAT can't be blocked by a hardcoded subject list.
- **Priority call:** for Funza, terms + report cards come **before** the AI features. Report cards get you in the door; AI upsells once inside.

### Gap 4 — Selection-screen privacy + demo school
- `unlisted: true` flag on `masterSchool` + "enter school code" path — some schools won't want to appear in a public list.
- A built-in **demo school** tenant with fake data, listed in the app — a cold-emailed principal experiences the product in 30 seconds with zero provisioning.

### Gap 5 — Tenant-scope the existing infrastructure (silent cross-school leak risks)
- **Redis cache keys** must be prefixed with the school slug — `cacheMiddleware.js` currently has no tenant dimension; without this, one school's cached responses can be served to another.
- **S3 keys** get per-school folders: `<slug>/notes/...`, `<slug>/profile-pictures/...`.
- **Cron jobs** (auto-mark-absent, weekly reports, billing snapshot) must iterate all active schools.
- **JWT binds schoolCode** as a claim; `x-school-code` header is client-controlled and only trusted pre-login (school list/branding). Post-login, header must match the token claim or the request is rejected.
- **Push notifications**: Expo tokens live in each school's own DB, so fan-out loops must run per-tenant.

### Gap 6 — Go-to-market quick wins
- Register **funza.co.za** (+ .com if available) and trademark early — before anything is public.
- **Free pilot term** for 2–3 private schools (this is exactly the `trial` state in Gap 1).
- The buyer champion is usually the **deputy principal / admin head**, not the principal or IT.
- Schools will expect a **WhatsApp support channel** — decide who answers it before onboarding school #2.
- AMSA live in production is the strongest sales asset — build the case study (numbers: registers signed, parent engagement, admin hours saved).

---

## Implementation Status Summary

| Feature | AMSA Status | Funza Status |
|---|---|---|
| Student/Parent/Tutor management | ✅ Done | Inherits from AMSA |
| Admin account management | ✅ Done (recently added) | Inherits from AMSA |
| Edit students/parents | ✅ Done (recently added) | Inherits from AMSA |
| Geofenced attendance | ✅ Done | Inherits from AMSA |
| Class scheduling | ✅ Done | Inherits from AMSA |
| Notes (PDF) | ✅ Done | Inherits from AMSA |
| Marks management | ✅ Done | Inherits from AMSA |
| Push notifications | ✅ Done | Inherits from AMSA |
| School config (geofence map) | ✅ Done | Inherits from AMSA |
| AI Chatbot | 🔲 Planned | 🔲 Planned (after AMSA) |
| Activity Tracking | 🔲 Planned | 🔲 Planned (after AMSA) |
| Weekly AI Parent Reports | 🔲 Planned | 🔲 Planned (after AMSA) |
| QR class register signing (cards + staff scanner) | 🔲 Planned (feature #4) | 🔲 Planned (after AMSA) |
| Intelligence-tier extras (early-warning, comment assist, ask-your-data) | 🔲 Idea (feature #5) | 🔲 Idea |
| Student ID cards / gate register signing | 🔲 Idea (feature #6) | 🔲 Idea — key for no-phone schools |
| Terms + report cards (CAPS) | 🔲 Gap — see Gap 3 | 🔲 Priority before AI features |
| CSV bulk import + activation cards | 🔲 Gap — see Gap 2 | 🔲 Required for onboarding |
| Billing (state machine, invoicing, debit orders) | N/A | 🔲 Gap — see Gap 1 |
| Multi-tenant architecture | N/A | 🔲 Planned (Refinement 1: useDb on one cluster) |
| School selection screen | N/A | 🔲 Planned (+ unlisted/join-by-code, Gap 4) |
| Dynamic branding per school | N/A | 🔲 Planned |
| Super admin panel | N/A | 🔲 Planned |
