# AMSA Learning Management System — Handoff

**Date:** 2026-06-17  
**Repo:** `c:\Users\hi\OneDrive\Desktop\PROJECTS\AMSA-Learning-Management-System`  
**Production API:** `https://amsa-learning-management-system-production.up.railway.app`  
**Git user:** VhulendaSmoke

---

## Project Structure

Three separate apps in one monorepo:

| Folder | What it is |
|---|---|
| `backend/` | Node.js / Express REST API (ES Modules) |
| `react-admin-tutor-web/` | React (Vite) admin + tutor web app — MUI v5 |
| `AMSA-Mobile/` | React Native (Expo) mobile app — students & parents |

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
- React Native (Expo SDK 53)
- Navigation: `@react-navigation/native` — Stack + Bottom Tab navigators
- Custom SVG icon system — `AMSA-Mobile/src/components/icons.ts` (NOT Ionicons/MaterialIcons — all icons must be manually added here)
- Theme system — `useTheme()` returns `colors: BrandPalette` from `src/context/ThemeContext.tsx`
- `GlassCard` component — `src/components/GlassCard.tsx` (accentColor, accentSide props)
- API calls via `api` axios instance from `src/services/api.ts`
- Push token stored on `User.pushToken`, synced on login

---

## Roles

| Role | Access |
|---|---|
| `admin` | Full admin web app — manages everything |
| `tutor` | Tutor section of admin web — schedules, attendance, marks, notes |
| `parent` | Mobile app only — views children, marks, attendance, messages |
| `student` | Mobile app only — dashboard, schedule, marks, attendance, notes |

---

## Backend Models (`backend/models/`)

| File | Purpose |
|---|---|
| `user.js` | All users (admin/tutor/parent/student). Has `pushToken`, `role`, `name`, `email`, `password` |
| `student.js` | Student profile — `user` (ref), `grade`, `subjects`, `parents` (array of User refs) |
| `tutor.js` | Tutor profile — `user` (ref), `subjects`, `assignedStudents` |
| `attendance.js` | Attendance record — `student`, `class` (ClassSchedule ref), `status` (present/absent/left_early) |
| `classSchedule.js` | Class — `subject`, `tutor`, `students`, `scheduledDate`, `grade`, `checkInCode`, `status` |
| `mark.js` | Grade record — `student`, `subject`, `score`, `total` |
| `notes.js` | Uploaded notes — `tutor`, `subject`, `grade`, `fileUrl`, `title` |
| `notification.js` | In-app notification — `recipient` (User ref), `recipientType`, `type` (enum), `message`, `read` |
| `schoolConfig.js` | School settings (name, logo, etc.) |
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
| `/api/auth` | `authRoutes.js` | POST /login, POST /register, PUT /push-token |
| `/api/admin` | `adminRoutes.js` | CRUD for students/tutors/parents/admins/marks/subjects |
| `/api/parents` | `parentRoutes.js` | GET /me/children, /me/marks, /me/attendance, /me/attendance/records |
| `/api/students` | `studentRoutes.js` | Student-facing endpoints |
| `/api/tutors` | `tutorRoutes.js` | Tutor-facing endpoints |
| `/api/attendance` | `attendanceRoutes.js` | Mark attendance, batch register |
| `/api/schedules` | `scheduleRoutes.js` | Class schedule CRUD |
| `/api/timetable` | `timetableRoutes.js` | Timetable view |
| `/api/academic` | `academicRoutes.js` | Grades/subjects lists |
| `/api/notifications` | `notificationRoutes.js` | GET notifications, POST announcement |
| `/api/messages` | `messageRoutes.js` | Conversation + messaging (see below) |

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
- Direct Expo push: `expo.sendPushNotificationsAsync(chunks)` — token stored on `User.pushToken`
- Push notification title for direct messages: **"New Message From AMSA President"**

---

## Admin Web Pages (`react-admin-tutor-web/src/pages/`)

**Admin (`/admin/...`):**
| Route | Component | Purpose |
|---|---|---|
| `/admin/dashboard` | `AdminDashboard.jsx` | Overview stats |
| `/admin/students` | `ManageStudents.jsx` | Student CRUD |
| `/admin/tutors` | `ManageTutors.jsx` | Tutor CRUD |
| `/admin/parents` | `ManageParents.jsx` | Parent CRUD |
| `/admin/admins` | `ManageAdmins.jsx` | Admin accounts |
| `/admin/marks` | `ManageMarks.jsx` | Marks management |
| `/admin/subjects` | `ManageSubjects.jsx` | Subject list |
| `/admin/schedules` | `ManageSchedules.jsx` | Class scheduling |
| `/admin/attendance` | `ClassAttendance.jsx` | Mark class attendance |
| `/admin/school-config` | `SchoolConfig.jsx` | School settings |
| `/admin/announcements` | `Announcements.jsx` | Push announcements to students/parents |
| `/admin/messages` | `Messages.jsx` | Direct messaging with parents |

**Messages page (`Messages.jsx`):**
- Split pane: left = conversation list, right = chat thread
- "New Conversation" button opens a Dialog with a searchable `Autocomplete` (MUI) to pick a parent by name/email
- Admin messages right-aligned (teal), parent messages left-aligned (grey)
- Calls `PATCH /:id/read` when a conversation is opened
- Unread badge on conversations in the list

---

## Mobile App

### Navigation

**Parent flow:**
```
RootNavigator
  └─ ParentApp (ParentStackNavigator)
       ├─ ParentTabs (bottom tabs)
       │    ├─ Dashboard
       │    ├─ Children
       │    ├─ Marks
       │    ├─ Attendance  ← added in this session
       │    └─ Profile
       ├─ NotificationSettings  (stack)
       ├─ NotificationList      (stack)
       └─ Messages              (stack)  ← added in this session
```

**Student flow:**
```
RootNavigator
  └─ StudentApp (StudentStackNavigator)
       ├─ StudentTabs (bottom tabs)
       └─ [stack screens: Calendar, ClassDetails, Notes, Marks, etc.]
```

Navigation types are in `AMSA-Mobile/src/types/navigation.ts` — update `ParentStackParamList` when adding new parent screens.

### Parent Screens (`AMSA-Mobile/src/screens/parent/`)

| File | Purpose |
|---|---|
| `DashboardScreen.tsx` | Home — quick actions (My Children, View Marks, Alerts→NotificationList, Messages→MessagesScreen) |
| `ChildrenScreen.tsx` | Lists children with View Marks / Attendance / Message actions |
| `MarksScreen.tsx` | Shows marks per child, filterable |
| `AttendanceScreen.tsx` | Attendance records per child, month filter, pull-to-refresh |
| `MessagesScreen.tsx` | Two-view screen: conversation list → chat thread with admin. Unread badges, pull-to-refresh |
| `ProfileScreen.tsx` | Profile photo, name, settings |

### Mobile Services (`AMSA-Mobile/src/services/`)

| File | Key methods |
|---|---|
| `api.ts` | Axios instance with base URL + auth token interceptor |
| `auth.ts` | login, register, updatePushToken |
| `parent.ts` | getChildren, getMarks, getAttendance, getChildrenAttendanceRecords |
| `messages.ts` | getConversations, getMessages, sendMessage, markRead |
| `notifications.ts` | getNotifications, markNotificationRead |
| `student.ts` | Student-specific endpoints |
| `academic.ts` | getGrades, getSubjects |

### Icon System

**CRITICAL:** The app uses a custom SVG path map, NOT Expo vector icons.  
File: `AMSA-Mobile/src/components/icons.ts`  
Usage: `<Icon name="calendar" size={20} color="#fff" />`  
If an icon name is not in the map, the app logs a WARN and renders nothing.  
**Always add new icon names to `icons.ts` before using them.**

Currently registered icons include: `arrow-back`, `send`, `calendar`, `calendar-outline`, `chatbubble`, `chatbubble-outline`, `notifications`, `notifications-off-outline`, `people`, `people-outline`, `school`, `school-outline`, `bar-chart`, `bar-chart-outline`, `person`, `person-outline`, `home`, `home-outline`, `document`, `document-outline`, `send`, `exit-outline`, and others.

---

## Key Patterns to Follow

**Adding a new backend route:**
1. Create `backend/controllers/yourController.js` with named exports
2. Create `backend/routes/yourRoutes.js` — `router.use(authenticate)` at top
3. Register in `backend/server.js`: `app.use('/api/your-path', yourRoutes)`

**Adding a new admin page:**
1. Create `react-admin-tutor-web/src/pages/Admin/YourPage.jsx`
2. Add to `Sidebar.jsx` `adminLinks` array with MUI icon
3. Add `<Route path="/admin/your-path" element={<YourPage />} />` inside the admin `ProtectedRoute` block in `App.jsx`

**Adding a new parent stack screen:**
1. Add name to `ParentStackParamList` in `AMSA-Mobile/src/types/navigation.ts`
2. Create `AMSA-Mobile/src/screens/parent/YourScreen.tsx`
3. Add `<Stack.Screen name="YourScreen" component={YourScreen} options={{ headerShown: false }} />` inside `ParentStackNavigator` in `App.tsx`
4. Import the screen at the top of `App.tsx`

**Adding a new parent tab:**
1. Do all the stack steps above
2. Add the screen to `ParentTabNavigator` in `App.tsx`
3. Add the icon cases to the tab icon switch statement in `App.tsx`

---

## Known Issues / TODOs

- `ChildrenScreen.tsx` — "Attendance" button per child still shows a "Coming Soon" alert. It should navigate to the Attendance tab or filter by child.
- `ParentStackParamList.Marks` is typed as `undefined` but `ChildrenScreen` navigates to it with `{ childId }` — pre-existing type mismatch, not yet fixed.
- The weekly report job (`weeklyReportJob.js`) sends a push notification but does NOT create a `Notification` document in the DB — meaning reports don't appear in the parent's NotificationList. `sendWeeklyReport` in `notificationService.js` does create the DB record, but verify the job is calling that helper correctly.
- Expo Go does not support remote push notifications from SDK 53 onwards. Testing push notifications requires a development build (`expo run:ios` / `expo run:android`).

---

## Environment Variables (Railway / `.env`)

```
MONGODB_URI=...
JWT_SECRET=...
PORT=...
```
Push notifications use `expo-server-sdk` — no additional API key needed (Expo handles delivery).

---

## Uncommitted Changes (as of this handoff)

One file modified, not yet committed:
- `backend/controllers/messageController.js` — fixed `isParticipant` to handle populated Mongoose refs and to allow any admin to access any conversation.

Commit with:
```bash
git add backend/controllers/messageController.js
git commit -m "fix: resolve 403 on parent message replies by handling populated refs in isParticipant"
```
