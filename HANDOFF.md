# AMSA Learning Management System — Handoff

**Date:** 2026-08-05
**Repo:** `c:\Users\hi\OneDrive\Desktop\PROJECTS\AMSA-Learning-Management-System`
**Production API:** `https://amsa-learning-management-system-production.up.railway.app`
**Git user:** VhulendaSmoke

---

## 🔴 CURRENT SESSION: NFC Tap-Attendance + Admin Mobile App

**Status:** Code-complete (backend + mobile), typechecks clean, **nothing committed yet**. Physical NFC cards have just arrived (Miccory NFC215 PVC cards, confirmed NDEF-writable).

**Plan file:** `C:\Users\hi\.claude\plans\clever-spinning-cerf.md` — read this first for full architecture/rationale.

### What was built
- A brand-new **admin/staff role in `AMSA-Mobile`** (previously mobile only had student/parent) that fully mirrors `react-admin-tutor-web`'s admin pages.
- **NFC tap-attendance**: admin/staff taps a student's physical NFC card against their phone → shows the student's photo/name → auto-computes present/late from the class's scheduled start time → marks attendance server-side.
- **Card enrollment**: admin picks a student, taps a blank card, app writes a server-generated opaque token onto it (never the raw student ID — revocable if lost).
- **New restricted `staff` role**: can log in but can reach *only* the Tap Attendance screen. Enforced by (a) the mobile tab navigator only rendering the Tap+Profile tabs for `role === 'staff'`, and (b) the backend — `staff` appears in exactly **one** `authorize()` call in the whole backend (`POST /api/attendance/nfc-tap`).

### Immediate next steps (in order)
1. **Kick off a new EAS dev-client build** — `react-native-nfc-manager` is a new native module, so the currently-installed dev-client on test devices will NOT have NFC support until rebuilt:
   ```bash
   cd AMSA-Mobile
   eas build --profile development --platform android   # (or --platform ios)
   ```
2. **Install the new build on a physical NFC-capable phone** — NFC cannot be tested in a simulator/emulator.
3. **Seed test data**: an admin account, a student with a class scheduled *today* (so the tap screen's auto-resolution has something to match), and log in as admin.
4. **Test the Enroll flow**: Admin tab → Enroll → pick the test student → tap a blank card → confirm it writes successfully.
5. **Test the Tap flow**: Tap tab → Start Scanning → tap the enrolled card → confirm the student's name/photo/status appear. (Note: no photo will show until one is uploaded via Students → [student] → Change Photo in the admin app.)
6. **Test duplicate tap** (should show "already marked", not double-mark) and **test an unenrolled/blank card** (should show a clear "not recognized" error).
7. **Seed a `staff` role test account** (via Admins → Staff in the app, or directly in Mongo: `role: "staff"`), log in as that account, and confirm it can reach *only* Tap + Profile — try to deep-link/navigate to any other admin screen and confirm it's inaccessible.
8. Once verified, **commit the work** (nothing from this feature is committed yet — see "Uncommitted Changes" below) and consider whether to phase a rollout (e.g. pilot with one class before issuing cards school-wide).

### Key files (new/changed this session)
**Backend:** `models/card.js` (new), `models/{user,student,attendance,schoolConfig}.js`, `controllers/cardController.js` (new), `controllers/{admin,attendance}Controller.js`, `routes/cardRoutes.js` (new), `routes/{admin,attendance}Routes.js`, `utils/s3Service.js` (added `folder` param), `server.js` (mounted `/api/cards`, added `nfcLateGraceMinutes` to school-config GET/PUT).

**Mobile:** `App.tsx` (new Admin/Staff Stack+Tab navigators), `app.json` (added `react-native-nfc-manager` plugin), all of `src/screens/admin/*` (new — 17 screens), `src/services/{admin,cards,attendanceAdmin}.ts` (new), `src/components/{ChipSelector,FormModal}.tsx` (new, shared by the admin CRUD screens), `src/components/icons.ts` (added `card-outline`, `add-circle-outline`).

### Design decisions worth knowing before touching this code
- **Card data model**: physical tag holds a single NDEF text record containing an opaque random token — never the student's Mongo ID. `Card.token` → `Card.student` mapping lives server-side. Losing a card = revoke it (`PATCH /api/cards/:id/revoke`); the physical tag itself becomes permanently useless, no need to recover it.
- **Present/late boundary**: computed fresh in `nfcTapAttendance` (`attendanceController.js`) off `ClassSchedule.classStartTime + SchoolConfig.nfcLateGraceMinutes` (default 10 min). Deliberately does **not** reuse `ClassSchedule.checkInStart/checkInEnd` — those are anchored to the class's *end* time (a pre-existing quirk for student self-check-in), wrong semantics for a door-tap system.
- **Student photo is a NEW backend-stored field** (`Student.photoUrl`, admin-uploaded via `POST /api/admin/students/:id/photo`). Do not confuse with the pre-existing student/parent `ProfileScreen.tsx` photo picker — that one is local-device-only (`saveProfilePicture()`), never uploaded, and is unrelated/irrelevant to what the tap screen displays.
- **No tutor-update endpoint exists** (backend or web) — `ManageTutorsScreen.tsx` intentionally only supports create/list/delete, matching the web app's actual capability. Don't "fix" this without checking if it's wanted first.
- **`AccountManagerScreen.tsx`** is a shared component backing both `ManageAdminsScreen.tsx` and `ManageStaffScreen.tsx` (same UI, different endpoints) — edit the shared component, not both screens, for UI changes.

---

## Project Structure

Three separate apps in one monorepo:

| Folder | What it is |
|---|---|
| `backend/` | Node.js / Express REST API (ES Modules) |
| `react-admin-tutor-web/` | React (Vite) admin + tutor web app — MUI v5 |
| `AMSA-Mobile/` | React Native (Expo) mobile app — students, parents, **and now admin/staff** |

---

## Tech Stack

**Backend**
- Node.js + Express, ES Modules (`import/export`)
- MongoDB / Mongoose
- JWT auth — `authenticate` + `authorize(...roles)` middleware in `backend/middleware/authMiddleware.js`
- `expo-server-sdk` for Expo push notifications
- `node-cron` for scheduled jobs
- Deployed on Railway

**Admin Web**
- React (Vite) + React Router v6
- Material UI v5
- Auth via `useAuth()` hook, API calls via `src/services/apiService.js` (axios instance)
- Feedback via `useSnackbar()` from `src/context/SnackbarContext.jsx`

**Mobile**
- React Native (Expo SDK 54) — uses `expo-dev-client`/EAS custom builds, NOT plain Expo Go (required for native modules like `react-native-nfc-manager` and `react-native-onesignal`)
- Navigation: `@react-navigation/native` — Stack + Bottom Tab navigators, declared inline in `App.tsx` (no separate `navigation/` folder)
- Custom SVG icon system — `AMSA-Mobile/src/components/icons.ts` (NOT Ionicons/MaterialIcons — all icons must be manually added here)
- Theme system — `useTheme()` returns `colors: BrandPalette` from `src/context/ThemeContext.tsx`
- `GlassCard` component — `src/components/GlassCard.tsx` (accentColor, accentSide props)
- Shared admin form components — `src/components/ChipSelector.tsx` (grade/subject multi-select), `src/components/FormModal.tsx` (bottom-sheet create/edit forms)
- API calls via `api` axios instance from `src/services/api.ts`
- Push token stored on `User.pushToken`, synced on login
- NFC via `react-native-nfc-manager` (added this session — see CURRENT SESSION above)

---

## Roles

| Role | Access |
|---|---|
| `admin` | Full admin web app **+ full admin mobile app** (new this session) |
| `tutor` | Tutor section of admin web — schedules, attendance, marks, notes |
| `parent` | Mobile app only — views children, marks, attendance, messages |
| `student` | Mobile app only — dashboard, schedule, marks, attendance, notes |
| `staff` | **New this session.** Mobile app only, restricted to the NFC Tap Attendance screen — for front-desk staff taking attendance who shouldn't touch marks/schedules/other admin data |

---

## Backend Models (`backend/models/`)

| File | Purpose |
|---|---|
| `user.js` | All users (admin/tutor/parent/student/**staff**). Has `pushToken`, `role`, `name`, `email`, `password` |
| `student.js` | Student profile — `user` (ref), `grade`, `subjects`, `parents` (array of User refs), **`photoUrl`, `photoUpdatedAt`** (new — admin-uploaded photo, shown on NFC tap) |
| `tutor.js` | Tutor profile — `user` (ref), `subjects`, `assignedStudents` |
| `card.js` | **New.** NFC card ↔ student mapping — `student` (ref), `token` (unique opaque string written to the tag), `status` (active/revoked), `enrolledBy/At`, `revokedBy/At/Reason`, `lastTapAt` |
| `attendance.js` | Attendance record — `student`, `class` (ClassSchedule ref), `status` (present/absent/late/excused/left_early), `checkIn.verificationMethod` now includes `"nfc"`, plus new `checkIn.card` (ref) and `checkIn.markedBy` (ref User) for tap audit trail |
| `classSchedule.js` | Class — `subject`, `tutor`, `students`, `scheduledDate`, `grade`, `checkInCode`, `status` |
| `mark.js` | Grade record — `student`, `subject`, `score`, `total` |
| `notes.js` | Uploaded notes — `tutor`, `subject`, `grade`, `fileUrl`, `title` |
| `notification.js` | In-app notification — `recipient` (User ref), `recipientType`, `type` (enum), `message`, `read` |
| `schoolConfig.js` | School settings — geofencing, IP allowlist, check-in buffers, **`nfcLateGraceMinutes`** (new — minutes after class start an NFC tap still counts "present") |
| `subject.js` | Subject master list |
| `conversation.js` | Admin↔Parent messaging thread — `admin` (User ref), `parent` (User ref), unique index on (admin, parent), `unreadByAdmin`, `unreadByParent` |
| `message.js` | Individual message — `conversation` (ref), `sender` (User ref), `senderRole` (admin/parent), `content`, `read` |

**Notification `type` enum:**
`class_reminder | check_in_available | announcement | attendance_alert | general | weekly_report | direct_message`

---

## Backend Routes (`backend/routes/`)

All routes registered in `backend/server.js` under `/api/...`

| Mount | File | Key endpoints |
|---|---|---|
| `/api/auth` | `authRoutes.js` | POST /login, POST /register, PUT /push-token, POST /change-password |
| `/api/admin` | `adminRoutes.js` | CRUD for students/tutors/parents/admins/**staff**/marks/subjects, **POST /students/:id/photo** (new) |
| `/api/cards` | `cardRoutes.js` | **New.** POST /enroll, GET /student/:id, PATCH /:id/revoke, GET / — all admin-only |
| `/api/parents` | `parentRoutes.js` | GET /me/children, /me/marks, /me/attendance, /me/attendance/records |
| `/api/students` | `studentRoutes.js` | Student-facing endpoints |
| `/api/tutors` | `tutorRoutes.js` | Tutor-facing endpoints |
| `/api/attendance` | `attendanceRoutes.js` | Mark attendance, batch register, **POST /nfc-tap** (new — admin+staff) |
| `/api/schedules` | `scheduleRoutes.js` | Class schedule CRUD |
| `/api/timetable` | `timetableRoutes.js` | Timetable view |
| `/api/academic` | `academicRoutes.js` | Grades/subjects lists |
| `/api/notifications` | `notificationRoutes.js` | GET notifications, POST announcement |
| `/api/messages` | `messageRoutes.js` | Conversation + messaging (see below) |

**NFC tap endpoint (`POST /api/attendance/nfc-tap`):**
```
Body: { cardToken, classId? }
Auth: authorize(['admin', 'staff'])   ← the ONLY route staff can reach besides auth/profile basics
Resolves card → student, resolves active class (explicit classId or auto-match today's
schedule ± the school's grace window), computes present/late, upserts Attendance,
returns { student: {name, photoUrl, grade}, class, status, checkInTime, alreadyMarked }.
404 if card unknown/revoked. 409 if multiple classes match (ask client to disambiguate).
```

**Message routes (`/api/messages`):**
```
GET    /                → getConversations  (admin sees all; parent sees own)
POST   /                → createOrGetConversation  (admin only)
GET    /:id             → getMessages  (admin: any; parent: own only)
POST   /:id             → sendMessage  (admin: any; parent: own only)
PATCH  /:id/read        → markRead
```

**Auth pattern on every protected route:**
```js
router.use(authenticate);                      // verify JWT, set req.userId + req.role
router.post('/', authorize('admin'), handler); // role guard (optional)
```

---

## Backend Jobs (`backend/jobs/`)

| File | Schedule | What it does |
|---|---|---|
| `notificationJobs.js` | Various | Class reminders, check-in notifications |
| `attendanceJobs.js` | Various | Attendance alerts |
| `weeklyReportJob.js` | Every Friday 18:00 | Sends each parent a push notification + in-app notification summarising their children's attendance and marks for the week |

All jobs are started via `.start()` static method, called from `backend/server.js` on startup.

**Push notification helper:** `backend/utils/notificationService.js`
- `NotificationService.sendToUser(userId, title, message, data)`
- `NotificationService.sendWeeklyReport(parent, summaryMessage, weekStart)`
- `NotificationService.sendManualAttendanceNotification(studentId, classDetails, status, markedByRole)` — reused by the NFC tap endpoint
- Direct Expo push: `expo.sendPushNotificationsAsync(chunks)` — token stored on `User.pushToken`
- Push notification title for direct messages: **"New Message From AMSA President"**

---

## Admin Web Pages (`react-admin-tutor-web/src/pages/`)

**Admin (`/admin/...`):**
| Route | Component | Purpose |
|---|---|---|
| `/admin/dashboard` | `AdminDashboard.jsx` | Overview stats |
| `/admin/students` | `ManageStudents.jsx` | Student CRUD |
| `/admin/tutors` | `ManageTutors.jsx` | Tutor CRUD (create/list/delete only — no update endpoint exists) |
| `/admin/parents` | `ManageParents.jsx` | Parent CRUD |
| `/admin/admins` | `ManageAdmins.jsx` | Admin accounts |
| `/admin/marks` | `ManageMarks.jsx` | Marks management |
| `/admin/subjects` | `ManageSubjects.jsx` | Subject list |
| `/admin/schedules` | `ManageSchedules.jsx` | Class scheduling |
| `/admin/attendance` | `ClassAttendance.jsx` | Mark class attendance (manual/batch — mirrored on mobile, coexists with NFC tap) |
| `/admin/school-config` | `SchoolConfig.jsx` | School settings — **does not yet expose `nfcLateGraceMinutes` in its UI; only the mobile SchoolConfigScreen does. Consider adding it here too.** |
| `/admin/announcements` | `Announcements.jsx` | Push announcements to students/parents |
| `/admin/messages` | `Messages.jsx` | Direct messaging with parents |

*(Note: `ManageStaff`/attendance-staff account management and card enrollment have no web-app equivalent — mobile-only for now, since the `staff` role and NFC cards are new this session.)*

**Messages page (`Messages.jsx`):**
- Split pane: left = conversation list, right = chat thread
- "New Conversation" button opens a Dialog with a searchable `Autocomplete` (MUI) to pick a parent by name/email
- Admin messages right-aligned (teal), parent messages left-aligned (grey)
- Calls `PATCH /:id/read` when a conversation is opened
- Unread badge on conversations in the list

---

## Mobile App

### Navigation

**Root switch** (`App.tsx` `Navigation` component): branches on `user.role` → `student` / `parent` / **`admin` or `staff`** (both mount `AdminStackNavigator`) / else Login.

**Parent flow:**
```
RootNavigator
  └─ ParentApp (ParentStackNavigator)
       ├─ ParentTabs (bottom tabs)
       │    ├─ Dashboard
       │    ├─ Children
       │    ├─ Marks
       │    ├─ Attendance
       │    └─ Profile
       ├─ NotificationSettings  (stack)
       ├─ NotificationList      (stack)
       └─ Messages              (stack)
```

**Student flow:**
```
RootNavigator
  └─ StudentApp (StudentStackNavigator)
       ├─ StudentTabs (bottom tabs)
       └─ [stack screens: Calendar, ClassDetails, Notes, Marks, etc.]
```

**Admin/Staff flow (new this session):**
```
RootNavigator
  └─ AdminApp (AdminStackNavigator)
       ├─ AdminTabs (bottom tabs — role-conditional, same navigator serves both roles)
       │    ├─ Dashboard   (admin only)
       │    ├─ Tap         (admin + staff — the NFC reader)
       │    ├─ Enroll      (admin only — write/revoke cards)
       │    └─ Profile     (admin + staff — logout, change password)
       └─ [stack screens, reached via Dashboard tiles, admin only]:
            ManageStudents, ManageTutors, ManageParents, ManageSchedules,
            ClassAttendanceMirror, ManageMarks, ManageSubjects, ManageAdmins,
            ManageStaff, SchoolConfig, Announcements, AdminMessages, ManageCards
```

Navigation types are in `AMSA-Mobile/src/types/navigation.ts` — update `ParentStackParamList` when adding new parent screens. (The admin stack doesn't yet have a typed param list — screens are navigated to by string name; consider adding one if this grows further.)

### Parent Screens (`AMSA-Mobile/src/screens/parent/`)

| File | Purpose |
|---|---|
| `DashboardScreen.tsx` | Home — quick actions (My Children, View Marks, Alerts→NotificationList, Messages→MessagesScreen) |
| `ChildrenScreen.tsx` | Lists children with View Marks / Attendance / Message actions |
| `MarksScreen.tsx` | Shows marks per child, filterable |
| `AttendanceScreen.tsx` | Attendance records per child, month filter, pull-to-refresh |
| `MessagesScreen.tsx` | Two-view screen: conversation list → chat thread with admin. Unread badges, pull-to-refresh |
| `ProfileScreen.tsx` | Profile photo (local-device-only, NOT uploaded — see CURRENT SESSION notes above), name, settings |

### Admin/Staff Screens (`AMSA-Mobile/src/screens/admin/`) — new this session

| File | Purpose |
|---|---|
| `TapAttendanceScreen.tsx` | **Flagship.** NFC reader — scan/result flow, optional class pre-select, handles ambiguous-class 409 |
| `EnrollCardScreen.tsx` | Student picker → write/revoke a card |
| `ManageCardsScreen.tsx` | Audit list of all enrolled cards + revoke |
| `AdminProfileScreen.tsx` | Shared by admin + staff — logout, change password |
| `AdminDashboardScreen.tsx` | Stats + navigation hub (tiles into every Stack-level screen below) |
| `ManageStudentsScreen.tsx` | CRUD + photo upload (the photo the Tap screen displays) |
| `ManageTutorsScreen.tsx` | Create/list/delete only (no update endpoint) |
| `ManageParentsScreen.tsx` | CRUD + link-to-student |
| `ManageSchedulesScreen.tsx` | Class schedule CRUD |
| `ClassAttendanceScreen.tsx` | Manual/batch attendance marking (mirrors web `ClassAttendance.jsx`) |
| `ManageMarksScreen.tsx` | View/filter/delete marks |
| `SchoolConfigScreen.tsx` | Edit school settings incl. `nfcLateGraceMinutes` |
| `ManageAdminsScreen.tsx` / `ManageStaffScreen.tsx` | Thin wrappers around shared `AccountManagerScreen.tsx` |
| `ManageSubjectsScreen.tsx` | Subject CRUD + activate/deactivate |
| `AnnouncementsScreen.tsx` | Broadcast to students/parents by grade |
| `AdminMessagesScreen.tsx` | Conversation list/thread + start new conversation with a parent |

### Mobile Services (`AMSA-Mobile/src/services/`)

| File | Key methods |
|---|---|
| `api.ts` | Axios instance with base URL + auth token interceptor |
| `auth.ts` | login, register, updatePushToken |
| `parent.ts` | getChildren, getMarks, getAttendance, getChildrenAttendanceRecords |
| `messages.ts` | getConversations, getMessages, sendMessage, markRead, **createOrGetConversation** (admin-only, new) |
| `notifications.ts` | getNotifications, markNotificationRead |
| `student.ts` | Student-specific endpoints |
| `academic.ts` | getGrades, getSubjects — reused by admin CRUD forms for grade/subject pickers |
| `admin.ts` | **New.** Full mirror of the adminController surface — students/tutors/parents/marks/admins/staff/subjects CRUD, photo upload, school config, schedules, announcements |
| `cards.ts` | **New.** enrollCard, getCardForStudent, revokeCard, listCards |
| `attendanceAdmin.ts` | **New.** tapAttendance, getTodaySchedules, getAllAttendance, markBatch |

### Icon System

**CRITICAL:** The app uses a custom SVG path map, NOT Expo vector icons.
File: `AMSA-Mobile/src/components/icons.ts`
Usage: `<Icon name="calendar" size={20} color="#fff" />`
If an icon name is not in the map, the app logs a WARN and renders nothing.
**Always add new icon names to `icons.ts` before using them.**

Currently registered icons include: `arrow-back`, `send`, `calendar`, `calendar-outline`, `chatbubble`, `chatbubble-outline`, `notifications`, `notifications-off-outline`, `people`, `people-outline`, `school`, `school-outline`, `bar-chart`, `bar-chart-outline`, `person`, `person-outline`, `home`, `home-outline`, `document-text`, `document-text-outline`, `send`, `exit-outline`, `finger-print` (reused for the NFC scan animation), **`card-outline`, `add-circle-outline`** (new this session), and others.

---

## Key Patterns to Follow

**Adding a new backend route:**
1. Create `backend/controllers/yourController.js` with named exports
2. Create `backend/routes/yourRoutes.js` — `router.use(authenticate)` at top
3. Register in `backend/server.js`: `app.use('/api/your-path', yourRoutes)`

**Adding a new admin page (web):**
1. Create `react-admin-tutor-web/src/pages/Admin/YourPage.jsx`
2. Add to `Sidebar.jsx` `adminLinks` array with MUI icon
3. Add `<Route path="/admin/your-path" element={<YourPage />} />` inside the admin `ProtectedRoute` block in `App.jsx`

**Adding a new parent stack screen (mobile):**
1. Add name to `ParentStackParamList` in `AMSA-Mobile/src/types/navigation.ts`
2. Create `AMSA-Mobile/src/screens/parent/YourScreen.tsx`
3. Add `<Stack.Screen name="YourScreen" component={YourScreen} options={{ headerShown: false }} />` inside `ParentStackNavigator` in `App.tsx`
4. Import the screen at the top of `App.tsx`

**Adding a new parent tab (mobile):**
1. Do all the stack steps above
2. Add the screen to `ParentTabNavigator` in `App.tsx`
3. Add the icon cases to the tab icon switch statement in `App.tsx`

**Adding a new admin CRUD screen (mobile, new pattern this session):**
1. Add methods to `src/services/admin.ts` if the endpoint doesn't already have a wrapper
2. Create `src/screens/admin/YourScreen.tsx` — reuse `ChipSelector` (grade/subject pickers), `FormModal` + `formInputStyle` (create/edit forms), following `ManageSubjectsScreen.tsx` as the simplest reference
3. Import in `App.tsx`, add a `Stack.Screen` entry in `AdminStackNavigator`'s mapped array, and add a tile to `AdminDashboardScreen.tsx`'s `ManageTiles` array pointing at the same screen name

---

## Known Issues / TODOs

- **NFC feature (this session) is untested on real hardware — see CURRENT SESSION section at top for the test plan.**
- `react-admin-tutor-web`'s `SchoolConfig.jsx` doesn't expose the new `nfcLateGraceMinutes` field — only the mobile `SchoolConfigScreen.tsx` does. Low priority, but worth adding to the web page for parity.
- No typed `AdminStackParamList` yet — admin screens are navigated to by raw string name. Fine at current size; add one if the admin stack keeps growing.
- `ChildrenScreen.tsx` — "Attendance" button per child still shows a "Coming Soon" alert. It should navigate to the Attendance tab or filter by child.
- `ParentStackParamList.Marks` is typed as `undefined` but `ChildrenScreen` navigates to it with `{ childId }` — pre-existing type mismatch, not yet fixed.
- The weekly report job (`weeklyReportJob.js`) sends a push notification but does NOT create a `Notification` document in the DB — meaning reports don't appear in the parent's NotificationList. `sendWeeklyReport` in `notificationService.js` does create the DB record, but verify the job is calling that helper correctly.
- Expo Go does not support remote push notifications from SDK 53+, and now also can't load the app at all once `react-native-nfc-manager` is linked (native module) — a dev-client build is mandatory for all testing going forward, not just NFC screens.

---

## Environment Variables (Railway / `.env`)

```
MONGODB_URI=...
JWT_SECRET=...
PORT=...
AWS_REGION=...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_BUCKET_NAME=...
```
Push notifications use `expo-server-sdk` — no additional API key needed (Expo handles delivery).
S3 (`utils/s3Service.js`) is used for tutor notes uploads and, new this session, student photo uploads (`uploadToS3` now takes an optional `folder` param — `"notes"` default, `"photos"` for student photos).

---

## Uncommitted Changes (as of this handoff)

**Nothing from the NFC/admin-mobile feature has been committed yet.** Full diff as of this handoff:

Modified:
- `AMSA-Mobile/App.tsx`, `app.json`, `package.json`/`package-lock.json` (added `react-native-nfc-manager`)
- `AMSA-Mobile/src/components/icons.ts`
- `AMSA-Mobile/src/screens/parent/ProfileScreen.tsx`, `src/screens/student/ProfileScreen.tsx` (unrelated Android 13+ photo-picker permission fix, pre-existing before this session)
- `AMSA-Mobile/src/services/messages.ts` (added `createOrGetConversation`)
- `backend/controllers/adminController.js`, `backend/controllers/attendanceController.js`
- `backend/models/attendance.js`, `backend/models/schoolConfig.js`, `backend/models/student.js`, `backend/models/user.js`
- `backend/routes/adminRoutes.js`, `backend/routes/attendanceRoutes.js`
- `backend/server.js`, `backend/utils/s3Service.js`

New (untracked):
- `AMSA-Mobile/src/components/ChipSelector.tsx`, `FormModal.tsx`
- `AMSA-Mobile/src/screens/admin/` (whole directory — 17 screens)
- `AMSA-Mobile/src/services/admin.ts`, `cards.ts`, `attendanceAdmin.ts`
- `backend/controllers/cardController.js`, `backend/models/card.js`, `backend/routes/cardRoutes.js`
- `FEATURES.md`, `FUNZA.md` (unrelated — pre-existing before this session)

**Recommend committing only after the physical-device test pass above succeeds** — this is a large, security-relevant change (new role, new auth-gated endpoint) worth verifying before it lands in history. When ready:
```bash
git add AMSA-Mobile/App.tsx AMSA-Mobile/app.json AMSA-Mobile/package.json AMSA-Mobile/package-lock.json \
        AMSA-Mobile/src/components/icons.ts AMSA-Mobile/src/components/ChipSelector.tsx AMSA-Mobile/src/components/FormModal.tsx \
        AMSA-Mobile/src/screens/admin/ AMSA-Mobile/src/services/admin.ts AMSA-Mobile/src/services/cards.ts AMSA-Mobile/src/services/attendanceAdmin.ts \
        AMSA-Mobile/src/services/messages.ts \
        backend/controllers/adminController.js backend/controllers/attendanceController.js backend/controllers/cardController.js \
        backend/models/attendance.js backend/models/schoolConfig.js backend/models/student.js backend/models/user.js backend/models/card.js \
        backend/routes/adminRoutes.js backend/routes/attendanceRoutes.js backend/routes/cardRoutes.js \
        backend/server.js backend/utils/s3Service.js
git commit -m "feat: NFC tap-attendance, full admin mobile app, restricted staff role"
```
(Left out of that commit: the pre-existing, unrelated `ProfileScreen.tsx` permission fix and `FEATURES.md`/`FUNZA.md` — commit those separately if/when appropriate.)
