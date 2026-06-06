# FUNZA — Full Project Context
> Read this file at the start of any new Claude Code session to get full context.
> UI/Design is handled separately via uploaded design files.

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

**New files:**
```
backend/controllers/chatController.js
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
GET  /api/activity/parent/children     ← per-child summary for parent
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

## Funza Multi-Tenant Architecture

### Core Concept
One backend server handles all schools. Each school has its own MongoDB database. The tenant middleware reads the school from the JWT and connects to the correct database. All existing controllers run unchanged — they just operate on whichever database the middleware connected to.

### New Backend Files (Funza only)
```
backend/models/masterSchool.js
  { name, slug, mongoUri, logoUrl, primaryColor, tier, active, studentCount }
  ← stored in a separate MASTER database, not in any school's database

backend/middleware/tenantMiddleware.js
  ← reads schoolCode from JWT → finds school in master DB
  ← connects to school's mongoUri (connection cached in Map)
  ← sets req.schoolDb for controllers to use

backend/routes/schoolRegistryRoutes.js
  GET /api/schools          ← public, no auth — returns school list for selection screen
  GET /api/schools/:slug    ← public — returns one school's public info

backend/routes/superAdminRoutes.js
  ← protected by SUPER_ADMIN_KEY env var (not a user login)
  POST   /api/super-admin/schools      ← provision new school
  GET    /api/super-admin/schools      ← all schools with student counts
  PUT    /api/super-admin/schools/:slug ← update branding/tier/status
```

### New Mobile Files (Funza only)
```
src/screens/SchoolSelectionScreen.tsx
  ← first screen before login
  ← searchable list from GET /api/schools
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
  → if none:    SchoolSelectionScreen → pick school → LoginScreen
  → if saved:   LoginScreen (school branding already loaded)
  → if logged in: StudentApp / ParentApp (same as AMSA)
```

### Onboarding a New School
1. Platform owner logs into Super Admin panel
2. Adds school: name, slug, logo URL, primary color, MongoDB URI, tier (Core/Intelligence)
3. School immediately appears in mobile app's selection screen
4. School admin creates students/parents/tutors via web admin panel
5. Students open Funza → search school → select → login

### Super Admin Web Panel (Funza only)
```
react-admin-tutor-web/src/pages/SuperAdmin/
  SuperAdminDashboard.jsx   ← all schools overview, total students, revenue summary
  SchoolManagement.jsx      ← add/edit schools, set tier, upload logo, color picker
```

---

## Key Decisions Already Made

| Topic | Decision |
|---|---|
| AI provider | DeepSeek-V3 (`deepseek-chat`) — cheap, good quality |
| AI for math reasoning | DeepSeek-R1 option if needed |
| Multi-tenancy approach | Database-per-school (not schoolId field in shared DB) |
| School identification on mobile | School selection screen (searchable list) |
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
| Multi-tenant architecture | N/A | 🔲 Planned |
| School selection screen | N/A | 🔲 Planned |
| Dynamic branding per school | N/A | 🔲 Planned |
| Super admin panel | N/A | 🔲 Planned |
