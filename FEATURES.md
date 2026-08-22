# AMSA LMS — Feature Plans

Planned and in-progress features. Each entry documents the why, the design decisions, and the implementation plan.

---

# Feature: QR-Code Register Signing (Student QR Cards + Staff Scanner)

**Status:** Planned (2026-07-07)

## Context

Signing class registers is currently self-service (students check in from their phones, gated by school WiFi/IP) or manual (admin/tutor marking on the web). To make register-taking faster and staff-controlled, each student gets a **printable QR code card** (generated on the admin web side, individually or in bulk per grade). On the mobile app, **admins and tutors** get a new scanner section: they pick a class session, then scan students' printed QR codes — each scan flashes the student's **name + profile photo for ~10 seconds** and marks them present on that class's register. Students not enrolled in the selected class are rejected with a clear message.

Two structural gaps must be filled: **admins/tutors currently cannot use the mobile app at all** (the navigator only routes student/parent roles), and **profile photos exist only on each student's own device** — server-side photo storage (reusing the existing S3 service) is part of this work so the scanner overlay can show a real photo.

## Key design decisions

- **QR payload:** `AMSA-STUDENT:<Student._id>` — plain, unsigned, valid forever. Student `_id` (not User `_id`) because enrollment checks and the Attendance unique index key on it, and `ManageStudents.jsx` already has it per row. No signing needed: the scan endpoint requires an admin/tutor JWT and enforces enrollment, so a forged QR grants nothing staff can't already do; signing would break printed cards if the secret ever rotated.
- **Dedicated scan endpoint** (`POST /api/attendance/classes/:classId/scan`) rather than reusing `markStudentAttendance`: one round trip that validates the payload, checks enrollment, marks present with `verificationMethod: 'qr'` (already in the enum, `backend/models/attendance.js:49`), and returns `{ student: {name, grade, profilePictureUrl}, alreadyMarked }` for the overlay. A duplicate scan is a 200 with `alreadyMarked: true`, not an error. No check-in-window gate (staff action, same as manual marking).
- **Class picker reuses `GET /api/schedules?startDate&endDate`** — verified role-scoped in `backend/controllers/scheduleController.js` (tutor → own classes only, admin → all). No new endpoint.
- **Profile picture on the `User` model** (works for tutors/parents later; every relevant query already populates `user`). S3 key `profile-pictures/<userId>-<timestamp>.<ext>` (timestamped to dodge stale caches; old object deleted on replace), served as a public URL like notes today.
- **Web printing:** `qrcode.react` (`QRCodeSVG`) + `window.print()` on a standalone Layout-free route with `@media print` CSS. No jsPDF — the browser print dialog already makes PDFs.
- **Mobile scanner:** `expo-camera` `CameraView` with `barcodeScannerSettings: { barcodeTypes: ['qr'] }`. ⚠️ **New native module → requires a new EAS dev build** (`expo-dev-client` already configured); kick the build off early. Camera permission strings already exist in `app.json`.

## Phase 1 — Backend

1. **`backend/utils/s3Service.js`** — add optional `folder = "notes"` param to `uploadToS3` (key = `${folder}/${fileName}`); existing notes callers unaffected.
2. **`backend/models/user.js`** — add `profilePicture: { type: String, default: null }`.
3. **New `backend/routes/userRoutes.js` + `backend/controllers/userController.js`** — multer (memoryStorage, 5 MB limit, jpeg/png/webp filter, pattern copied from `tutorRoutes.js`):
   - `POST /me/profile-picture` (`authenticate`, any role): upload to S3 folder `profile-pictures`, delete old object (try/catch, non-fatal), save URL on User, return `{ profilePicture }`.
   - Mount in `backend/server.js`: `app.use("/api/users", userRoutes)`.
4. **`backend/routes/adminRoutes.js` + `adminController.js`**:
   - `POST /users/:userId/profile-picture` — same handler logic targeting `req.params.userId`.
   - `listStudents` (~line 241): populate select → `"name email profilePicture"`.
5. **Scan endpoint** — `backend/controllers/attendanceController.js` + `attendanceRoutes.js`:
   `router.post('/classes/:classId/scan', authenticate, authorize(['admin','tutor']), scanStudentQr)`
   Controller flow:
   - Reject non-`AMSA-STUDENT:`-prefixed or invalid-ObjectId payloads → 400 `{ code: 'INVALID_QR' }`.
   - Load ClassSchedule (404 `CLASS_NOT_FOUND`); if tutor, enforce `classSchedule.tutor === req.tutorId` (403 `NOT_YOUR_CLASS`).
   - Load Student populated with `user: 'name profilePicture'` (404 `STUDENT_NOT_FOUND`); build `studentInfo {studentId, name, grade, profilePictureUrl}`.
   - Not enrolled → 403 `{ code: 'NOT_ENROLLED', message: '<name> is not enrolled in this class', student: studentInfo }` (student included so the overlay shows *who* was rejected).
   - Already `present` → 200 `{ alreadyMarked: true, student }` — no notification.
   - Else upsert Attendance with dot-path `$set`: `status: 'present'`, `isVerified: true`, `checkIn.time`, `checkIn.verificationMethod: 'qr'`, `notes: 'QR scanned by <role>'` → fire `NotificationService.sendAttendanceConfirmation` → 200 `{ alreadyMarked: false, student }`.
6. Optional: include `profilePicture` in `getMyProfile`'s user populate (`backend/controllers/studentController.js`) so the student app can hydrate from the server.

**Verify:** curl multipart photo upload → URL saved + returned by `/admin/students`; scan endpoint: fresh mark → `alreadyMarked:false` and DB row shows `verificationMethod:'qr'`; rescan → `true`; non-enrolled student → 403 NOT_ENROLLED with student info; garbage qrData → 400; tutor token vs another tutor's class → 403.

## Phase 2 — Web admin (`react-admin-tutor-web`)

Install `qrcode.react`.

1. **`src/components/common/ProtectedRoute.jsx`** — add a `noLayout` prop that skips the `Layout` wrapper (it currently always wraps in the sidebar Layout).
2. **New `src/pages/Admin/PrintQrCards.jsx`** + route `/admin/print-qr` in `src/App.jsx` under an admin-protected `noLayout` group. Reads `?grade=` or `?studentId=` via `useSearchParams`, fetches `/admin/students`, filters, renders a 3-column CSS-grid of cards (school header, `<QRCodeSVG value={`AMSA-STUDENT:${student._id}`} size={140} level="M" />`, name, grade; `break-inside: avoid`), on-screen toolbar hidden by `@media print`, auto-`window.print()` after data loads.
3. **`src/pages/Admin/ManageStudents.jsx`**:
   - Per-row `QrCode2Icon` action → `window.open('/admin/print-qr?studentId=<id>', '_blank')`.
   - Toolbar "Print QR cards" button → opens `/admin/print-qr` with the current grade filter (all students if none).
   - Avatar column (`student.user?.profilePicture`, MUI `Avatar` initials fallback) + "Upload photo" (hidden file input) in the edit Dialog posting FormData field `photo` to `/admin/users/<userId>/profile-picture`, then refresh.

**Verify:** print-preview bulk sheet for a grade (no card splits across pages), single-student print, photo upload shows in the avatar column.

## Phase 3 — Mobile (`AMSA-Mobile`)

`npx expo install expo-camera`; add `"expo-camera"` plugin (with iOS `cameraPermission` message) to `app.json`; **start the EAS dev build immediately** — the long pole.

1. **`App.tsx`** — replace the fallback-to-Login branch: `admin`/`tutor` → new `StaffStackNavigator` (plain stack, no tabs): `ScanClassPicker` (title "Scan Register", headerRight logout via `useAuth().logout`) → `Scanner` (headerShown false).
2. **New `src/services/attendanceScan.ts`** — `getTodaysClasses()` → `GET /schedules` with today's `startDate`/`endDate` + `limit: 50`; `scanStudent(classId, qrData)` → `POST /attendance/classes/<classId>/scan`.
3. **New `src/screens/staff/ScanClassPickerScreen.tsx`** — FlatList of today's classes (title, subject, grade, time, room), pull-to-refresh, empty state, tap → navigate to Scanner with `{classId, className}`.
4. **New `src/screens/staff/ScannerScreen.tsx`** — the core:
   - `useCameraPermissions()` with a request card when not granted.
   - `<CameraView facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={overlay ? undefined : onBarcodeScanned} />`.
   - **Scan lock via `useRef`** (not state — `onBarcodeScanned` fires every frame): set on scan, released only when the overlay dismisses.
   - Overlay states: `success` (teal, "Marked present"), `already` (yellow, "Already signed in"), `rejected` (red, NOT_ENROLLED message with the student's name/photo), `error` (invalid QR / network). Styled after the existing transparent-fade Modal pattern in `App.tsx` (~L416–438): large circular photo (`profilePictureUrl`, DiceBear/initials fallback via `src/utils/avatarUtils.ts`), name, grade, status banner.
   - `setTimeout` auto-dismiss at **10 s**, plus tap-to-dismiss (whole overlay a `TouchableOpacity`); clear timer on unmount.
5. **`src/screens/student/ProfileScreen.tsx`** — after each `saveProfilePicture(...)` call (~L248, ~L271), fire-and-forget FormData upload to `/users/me/profile-picture` with explicit `multipart/form-data` header (RN axios needs the override); local cache stays the fast path, server URL is what scanners/web see.

**Verify:** on the new dev build — tutor sees only own classes; scan a printed card → overlay with name+photo and DB/web shows present with `verificationMethod:'qr'`; rescan → "Already signed in"; wrong-class student → red not-enrolled overlay; random QR → invalid-code message; airplane mode → error overlay, re-arms on tap; admin sees all classes.

## Phase 4 — End-to-end

Print a grade's card sheet → run a real register via phone scanning → confirm attendance in web `ClassAttendance` and that parent notifications fired once per student (not on duplicate scans).

## Sequencing notes

- Phase 1 blocks 2 & 3; Phases 2 and 3 are independent of each other afterwards (web QR printing only needs `student._id`, which exists today).
- Existing students have **no photos** — every UI (overlay, web avatar) must handle `profilePictureUrl === null` with initials/DiceBear fallback.

---

# Feature: Intelligence-Tier Extras (Beyond the Chatbot)

**Status:** Idea (2026-07-18) — Funza Intelligence-tier features; built AMSA-first like everything else. These make the R59 vs R29 gap feel obvious, and all run on data already collected (Attendance, Mark, planned ActivityLog).

## 1. Early-warning flags ("know which kid is sliding before the term report")

The feature principals actually buy. A weekly cron scores every student over the trailing fortnight:

- **Attendance dip** — absent/late rate vs the student's own prior baseline
- **Marks drop** — recent average vs prior term/period average per subject
- **App inactivity** — no `app_open` events in N days (from ActivityLog)

Two or more signals firing together → flag. **v1 is pure rules — no AI cost.** An AI-written one-paragraph summary per flagged student is an optional polish.

- New model: `StudentFlag { student, period, signals: [], severity, resolved, notes }`
- Admin web: dashboard widget + `AtRiskStudents.jsx` page (flag list, severity color, resolve/annotate)
- Parent: optional push — "We've noticed [child]'s attendance has dipped recently" (tone matters; admin can review before it goes out)
- Cron: weekly, before the Friday parent reports so reports can reference active flags

## 2. Tutor report-comment assist

AI drafts termly report-card comments from each student's marks + attendance; the tutor edits and approves — never auto-published. Teachers hate writing these; this alone can sell the tier to staff.

- Depends on the terms/report-card data model (see FUNZA.md Gap 3) — build after terms exist
- Tutor web: on the report-card editing view, per-student "Draft comment" button → editable text field
- POPIA rule applies: prompt carries marks/attendance stats only, no learner name; name is templated in after the AI call

## 3. Admin "ask your data"

The planned admin AI chat, but pitched and built as natural-language queries over the school's own data: "Which Grade 10s have missed Maths twice this month?", "Average Physical Sciences mark this term vs last?"

- Implementation: function-calling over a whitelist of existing queries (attendance aggregates, marks aggregates, activity summaries) — the AI never gets raw DB access, it picks a query + parameters, the backend runs it tenant-scoped
- Falls out of `chatController.js` + `aiProvider.js` once those exist; the query-tool whitelist is the new work

---

# Feature: Student ID Cards — Gate Register Signing (No-Phone Schools)

**Status:** Idea (2026-07-18) — motivated by Funza: many fee-paying schools **ban phones**, so self-service check-in (geofence/WiFi) is impossible for them. Every student gets a unique physical card; scanning it at the gate signs the daily register automatically. Builds directly on the QR-card printing + scanner infrastructure planned above.

## Context

This is the **daily (morning) register** — the legally required one in SA schools — which is distinct from AMSA's per-class attendance. A gate scan says "this learner arrived at school at 07:12", not "attended Maths". The per-class scanner feature above still covers class registers. Side benefit that may sell harder than the register itself: an instant parent push — "✅ Thandi arrived at school 07:12" — is a safety feature parents love, and it costs nothing extra.

## Key design decisions

- **Card payload: a revocable `cardId`, not `Student._id`.** Add `cardId` (random ~10-char base32, unique index) to Student. QR payload `FUNZA-CARD:<cardId>` (or the raw cardId for RFID). Reporting a card lost = regenerate `cardId`, reprint — the old card is instantly dead. This matters for gate registers because the threat isn't forgery (staff/kiosk auth gates the endpoint), it's **buddy-scanning with a lost/borrowed card**. Migrate the class-scanner feature above to `cardId` too before it ships, so one card serves both.
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

## Hardware tiers (all hit the same endpoint — schools choose by budget)

| Tier | Hardware | Cost | Throughput | Notes |
|---|---|---|---|---|
| 1. Staff phone | Existing mobile scanner app, new "Gate register" mode (no class picker) | R0 | ~5–8/min | Fine for small schools; reuses the Phase-3 scanner screen above |
| 2. Web Gate Mode + USB QR/barcode scanner | Any laptop + handheld scanner | ~R500–900/scanner | ~30/min | The sweet spot; scanner types into the Gate Mode page |
| 3. RFID/NFC tap cards + USB reader | 13.56 MHz **NTAG213/215** cards + USB reader | ~R10–20/card, reader ~R300–600 | ~60/min (1s tap) | Card UID stored as the student's `cardId`; same Gate Mode page unchanged. Durable, works in rain/dark, feels professional. Sell printed photo-ID cards as a per-card service fee |
| **3b. Staff phone as NFC reader** ("Apple Pay, flipped") | Same NFC cards + any NFC Android phone — **no reader hardware at all** | ~R10–20/card, R0 reader (or ~R1,500–2,500 for a dedicated cheap Android) | ~30–60/min on Android; slower on iPhone (system scan sheet per tap) | `react-native-nfc-manager` in the staff app; card UID = `cardId`; portable — gates, sports days, excursions, exam venues |
| 4. Multi-lane | N× tier 2/3/3b stations | linear | 800 learners in ~15 min with 2–3 lanes | Unique (student,date) index makes concurrent lanes safe |

### Phone as NFC reader (tier 3b detail) — **the recommended default: one Android phone + a box of blank NFC cards**

The tap-to-pay mental model, with the roles right: the **security guard's phone is the payment terminal** (reader mode), the **student's card is the bank card** (passive **NTAG213/215**, no battery). Students tap their cards on the back of the phone, ~1–2s each. No USB readers, no laptop, no printing.

- **Blank cards work day one — printing is optional.** Plain white **NTAG213/215** cards (~R8–15) or NFC **wristbands/keyfobs** (harder to lose, washing-machine-proof). Nothing is written or printed on the card, ever. **Card type matters:** NTAG213/215 only — avoid "MIFARE Classic" listings (often the cheapest); Classic's proprietary protocol fails on some Android phone chipsets.
- **Enrollment is a tap:** "Issue card" mode in the staff app — pick the student, tap a blank card, its factory UID is saved as that student's `cardId`. Hand it over, done. Lost card → tap a new blank one; the old UID dies instantly.
- **Anti-buddy-scanning needs no printed photo:** the guard's phone flashes the student's **name + photo on-screen** at every tap — the guard glances at the screen, not the card. Printed photo-ID cards stay an optional upsell (schools like them as ID cards), not a requirement.
- **Library:** `react-native-nfc-manager` (Expo config plugin exists, but native module → EAS dev build). Add it to the **same EAS build as `expo-camera`** — one build covers class scanner + gate QR + NFC.
- **Platform caveat — iPhones CAN read NFC cards, but with worse gate UX:** Core NFC (iPhone 7+) reads tags fine, including multiple taps per session via restartPolling. But (1) reading only works inside Apple's system "Ready to Scan" sheet, which covers half the screen and can't be replaced with our full-screen name+photo flash, and (2) sessions time out after ~60s, so the operator re-starts scanning every minute. Fine for a class of 25; miserable for an 800-learner gate queue. Android reader mode has no sheet, no timeout, and full custom UI — **gate device = a cheap Android phone; staff iPhones are fine for classroom-sized NFC scanning.**
- **Optional hybrid:** printing the QR on the card's face additionally enables phone-camera QR (fallback) and the USB-reader tier. Same `gate-scan` endpoint regardless; the payload is just UID vs QR string.

### Digital card — student phone as the card, no printing (phone-allowed schools only)

For schools that **allow** phones, skip printing entirely: the "card" lives in the student app.

- **"My Card" screen** in the student app: full-brightness QR the student shows at the gate; staff phone scans it with the same camera scanner built for class registers. Boarding-pass/gym-check-in pattern — works on every phone, zero hardware, zero printing.
- **Anti-screenshot:** a static QR could be screenshotted and shared ("scan me in, I'm bunking"). The QR embeds a rotating TOTP-style token — `FUNZA-DIGI:<studentId>:<6-digit code>` — regenerated every ~60s **offline** from a per-student seed (issued at login, stored on device), so it works with no signal at the gate but a screenshot dies within a minute. Server verifies the token with a ±1-window tolerance. Photo flash on the scanner stays as the second check.
- **Why NOT phone-tap-phone NFC (the tap-to-pay pattern):** tap-to-pay = the customer phone *emulating a card* (Host Card Emulation). Android apps can do HCE; **Apple locks card emulation to Apple Pay/Wallet** — third-party apps can't emulate (EU carve-outs don't help in SA). Phone-tap-phone would silently exclude every iPhone student, and RN HCE libraries are fragile community ports. Rejected — screen QR does the same job universally.
- **Fits as per-school config**, not a card replacement: phones-allowed schools → digital card (or existing geofence/WiFi self-check-in); phones-banned schools → printed QR/NFC cards. Same `gate-scan` endpoint everywhere; the digital payload is just one more format to parse.

## Web: `GateRegister.jsx` (the core build)

- Fullscreen, `noLayout` route (same pattern as `PrintQrCards.jsx`), giant status flash per scan: green name+photo+time / yellow "already scanned 07:12" / red "unknown card" — readable from metres away, with a running count for the morning
- Hidden always-focused `<input>` captures HID keyboard scans (refocus on blur); Enter submits
- **Offline tolerance** — gates have bad WiFi: queue failed posts in localStorage with the scan timestamp, retry banner ("3 scans pending"), flush when connectivity returns; server honors the client timestamp for late/present status
- Check-in / check-out mode toggle + auto-switch time

## Card printing

- Extend the planned `PrintQrCards.jsx` into a proper **ID-card layout**: school logo + primary color (tenant branding in Funza), student photo, name, grade, QR — credit-card size, print-and-laminate, or export for a card-printing bureau
- "Reissue card" action on `ManageStudents.jsx` row: regenerates `cardId`, opens the single-card print view

## Implementation: connecting NFC cards to the app

The chip's factory UID (a hex string, e.g. `04A3B2C1D80000`) is the entire integration — nothing is ever written to the card.

1. **Mobile native module:** `npx expo install react-native-nfc-manager` + its config plugin in `app.json` (`nfcPermission` message). Native module → **EAS dev build**, bundled with `expo-camera` (one build covers QR + NFC). ⚠️ Buy **NTAG213/215** cards, NOT "MIFARE Classic" — Classic's proprietary protocol fails on some Android chipsets.
2. **Reading:** Android = continuous reader mode (`NfcManager.setEventListener(NfcEvents.DiscoverTag, …)` + `registerTagEvent()` — fires per tap, no UI takeover). iOS = one session per tap (`requestTechnology(NfcTech.NfcA)` → `getTag()`, shows Apple's sheet). Normalize UIDs once (uppercase, no separators) — it's the primary key of the card system.
3. **Backend:** `Student.cardId: { type: String, default: null, index: { unique: true, sparse: true } }`. Endpoints: `POST /admin/students/:studentId/card { uid }` (409 with the other student's name if UID already linked; overwrite-on-relink = lost-card reissue) and `DELETE .../card` (unlink). `gate-scan` resolves `Student.findOne({ cardId: uid })`.
4. **Screens (staff navigator):** `IssueCardScreen` — pick student → "tap a blank card" → link → success flash → hand over. `GateScanScreen` — same listener → `POST gate-scan` → full-screen photo/name/status flash (~2s) → re-arm.
5. **Gate realities:** debounce repeat reads (same UID ignored ~3s — a held card fires repeatedly); queue failed posts locally with the tap timestamp (gate WiFi is bad) and retry in background.
6. **Build order:** backend first (curl-testable with no hardware) → EAS build → screens → ~R200 of NTAG213 cards for a real-phone end-to-end test.

## Keeping cards personal (avoiding mix-ups)

The **system** can never confuse cards — every NFC chip has a factory-burned, globally unique UID, linked to exactly one student at issue time. The risk is **humans** mixing up identical-looking blank cards. Layered fixes, free → fancy:

1. **Issue one-at-a-time:** enrollment flow forces pick student → tap → hand over *now* — no pre-linked batch lying around to shuffle
2. **"Whose card is this?" mode** in the staff app: tap any card → owner's name + photo. Mix-ups self-correct; lost-and-found becomes trivial
3. **Cheap labels:** marker or sticker with name + grade; admin web generates an **A4 sticker-sheet PDF** in issue order. Color-coded cards/lanyards per grade shrink the mix-up pool for free
4. **Photo flash at the gate is the safety net:** a swapped card shows the owner's face → caught on the spot → reissue both
5. **Printed photo-ID cards** = premium tier; visibly personal, doubles as school ID
- **Don't** write the student's name onto the chip (NTAG is writable): any stranger's phone could then read a child's name off a found card — POPIA smell for zero benefit over the app-only identify mode

## Anti-buddy-scanning

- Photo on the card + photo flash on the Gate Mode screen — the operator glances, that's the check
- Lost card → reissue kills the old `cardId` immediately
- Optional: flag statistically odd patterns later (e.g. two cards always scanned in the same second) — not v1

## Sequencing

1. `cardId` on Student + gate-scan endpoint + `DailyAttendance` model (small backend job)
2. `GateRegister.jsx` web page — this alone serves hardware tiers 2–4
3. ID-card print layout (extends the QR-card printing work already planned)
4. Parent arrival/departure push notifications
5. Mobile "Gate register" mode on the staff scanner screen (tier 1) — cheap once the class scanner exists
6. RFID enrollment flow (scan card UID into `cardId` when issuing) — only when a school asks
