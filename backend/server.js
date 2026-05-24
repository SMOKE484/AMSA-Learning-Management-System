import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import { authenticate, authorize } from "./middleware/authMiddleware.js";
import authRoutes from "./routes/authRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import studentRoutes from "./routes/studentRoutes.js";
import tutorRoutes from "./routes/tutorRoutes.js";
import parentRoutes from "./routes/parentRoutes.js";
import academicRoutes from "./routes/academicRoutes.js"; 
import scheduleRoutes from "./routes/scheduleRoutes.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";
import timetableRoutes from "./routes/timetableRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";

dotenv.config();

const app = express();

app.use(cors({
  origin: [
    'https://amsa-learning-management-system.vercel.app',
    'https://amsa-learning-management-system-cxwxt73t0.vercel.app',
    'http://localhost:3000',                               
    'http://localhost:5173',                               
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  credentials: true, 
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(express.json());

mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("MongoDB connected successfully");

    import('./config/redis.js')
      .then(() => {
        console.log('Redis configuration loaded');
      })
      .catch(err => {
        console.log('Redis config loading issue:', err.message);
      });

    try {
      const SchoolConfig = (await import('./models/schoolConfig.js')).default;
      const schoolConfig = await SchoolConfig.getConfig();
      console.log('School configuration loaded');
    } catch (error) {
      console.log('School configuration not set up yet');
    }

    try {
      const { AttendanceJobs } = await import('./jobs/attendanceJobs.js');
      const { NotificationJobs } = await import('./jobs/notificationJobs.js');
      
      AttendanceJobs.start();
      NotificationJobs.start();
      console.log('Cron jobs started for attendance and notifications');
    } catch (error) {
      console.log('Failed to start cron jobs:', error.message);
    }

    const PORT = process.env.PORT || 5000;
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server listening on port ${PORT}`);
      console.log(`Local: http://localhost:${PORT}`);
      console.log(`Network: http://192.168.110.97:${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      
      const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
      const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
      const schoolLat = process.env.SCHOOL_LATITUDE;
      const schoolLng = process.env.SCHOOL_LONGITUDE;
      
      if (redisUrl && redisToken) {
        console.log('Redis configuration found');
      } else {
        console.log('Redis not configured - caching will be disabled');
      }

      if (schoolLat && schoolLng) {
        console.log('School location configured');
      } else {
        console.log('School location not configured - geo-fencing disabled');
      }
    });
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error.message);
  });

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/tutors", tutorRoutes);
app.use("/api/parents", parentRoutes);
app.use("/api/academic", academicRoutes); 
app.use("/api/schedules", scheduleRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/timetable", timetableRoutes);
app.use("/api/notifications", notificationRoutes);

app.get("/", (req, res) => {
  res.send("Academic Management System API is running...");
});

app.get("/privacy-policy", (req, res) => {
  res.setHeader("Content-Type", "text/html");
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Privacy Policy – AMSA LMS</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 24px 16px; color: #222; line-height: 1.7; }
    h1 { color: #d0421b; }
    h2 { color: #1a5276; margin-top: 32px; }
    p, li { font-size: 15px; }
    ul { padding-left: 20px; }
    footer { margin-top: 48px; font-size: 13px; color: #666; border-top: 1px solid #ddd; padding-top: 12px; }
  </style>
</head>
<body>
  <h1>Privacy Policy</h1>
  <p><strong>App name:</strong> AMSA LMS<br/>
     <strong>Operated by:</strong> Alusani Maths &amp; Science Academy<br/>
     <strong>Last updated:</strong> ${new Date().toLocaleDateString("en-ZA", { year: "numeric", month: "long", day: "numeric" })}</p>

  <h2>1. Introduction</h2>
  <p>Alusani Maths &amp; Science Academy ("AMSA", "we", "our") operates the AMSA LMS mobile application. This Privacy Policy explains what personal information we collect, how we use it, and your rights regarding that information.</p>

  <h2>2. Information We Collect</h2>
  <ul>
    <li><strong>Account information:</strong> Full name, email address, role (student, tutor, parent, admin), and a hashed password.</li>
    <li><strong>Academic records:</strong> Grades, assignments, class schedules, and timetable data.</li>
    <li><strong>Attendance data:</strong> Check-in/check-out timestamps and, where geo-fencing is enabled, approximate GPS location at the time of check-in.</li>
    <li><strong>Device &amp; notification tokens:</strong> Push notification tokens used solely to deliver in-app notifications.</li>
    <li><strong>Usage data:</strong> Standard server logs (IP address, request timestamps) retained for security and debugging purposes.</li>
  </ul>

  <h2>3. How We Use Your Information</h2>
  <ul>
    <li>To provide and maintain the LMS platform (authentication, grade tracking, scheduling).</li>
    <li>To send push notifications about class reminders, attendance alerts, and academic updates.</li>
    <li>To verify on-site attendance using geo-fencing where enabled by the school.</li>
    <li>To generate reports for school administrators and parents.</li>
    <li>To improve app performance and fix bugs.</li>
  </ul>

  <h2>4. Data Sharing</h2>
  <p>We do <strong>not</strong> sell, rent, or trade personal information. Data is shared only as follows:</p>
  <ul>
    <li><strong>Within the school:</strong> Administrators, tutors, and parents can access data relevant to their role.</li>
    <li><strong>Service providers:</strong> MongoDB Atlas (database hosting), Railway (server hosting), and Expo/OneSignal (push notifications). These providers process data solely to deliver our services.</li>
    <li><strong>Legal requirements:</strong> If required by law or to protect the rights and safety of users.</li>
  </ul>

  <h2>5. Data Retention</h2>
  <p>Account and academic data is retained for the duration of a student's enrolment plus one academic year after graduation or withdrawal. You may request earlier deletion by contacting us.</p>

  <h2>6. Security</h2>
  <p>We use industry-standard measures including HTTPS/TLS in transit, bcrypt password hashing, and JWT authentication. No method of transmission or storage is 100% secure, and we cannot guarantee absolute security.</p>

  <h2>7. Children's Privacy</h2>
  <p>The app is used in an educational setting and may be used by students under 18. Accounts for minors are created and managed by the school or a parent/guardian. We do not knowingly collect data directly from children without parental or guardian consent facilitated through the school.</p>

  <h2>8. Your Rights</h2>
  <p>You have the right to access, correct, or request deletion of your personal data. To exercise these rights, contact us at the address below. We will respond within 30 days.</p>

  <h2>9. Changes to This Policy</h2>
  <p>We may update this policy from time to time. The updated version will be posted at this URL with a revised "Last updated" date. Continued use of the app after changes constitutes acceptance.</p>

  <h2>10. Contact Us</h2>
  <p>If you have questions about this Privacy Policy, please contact:<br/>
     <strong>Alusani Maths &amp; Science Academy</strong><br/>
     Email: <a href="mailto:vhulendamashamba4@gmail.com">vhulendamashamba4@gmail.com</a></p>

  <footer>© ${new Date().getFullYear()} Alusani Maths &amp; Science Academy. All rights reserved.</footer>
</body>
</html>`);
});

app.get("/api/health", async (req, res) => {
  const redisStatus = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN 
    ? "Configured" 
    : "Not Configured";

  const geoStatus = process.env.SCHOOL_LATITUDE && process.env.SCHOOL_LONGITUDE 
    ? "Configured" 
    : "Not Configured";

  const mongoStatus = mongoose.connection.readyState === 1 ? "Connected" : "Disconnected";

  res.json({
    status: "OK",
    message: "Academic Management System API is running",
    timestamp: new Date().toISOString(),
    services: {
      database: mongoStatus,
      authentication: "JWT Enabled",
      redis: redisStatus,
      geoFencing: geoStatus
    },
    features: {
      classScheduling: "Active",
      automatedAttendance: "Active",
      pushNotifications: "Active",
      timetable: "Active"
    },
    accessibleFrom: "All network interfaces"
  });
});

app.get("/api/redis-test", async (req, res) => {
  try {
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      return res.json({ 
        status: 'disabled', 
        message: 'Redis environment variables not set. Caching will be disabled.' 
      });
    }

    const { Redis } = await import('@upstash/redis');
    
    const testRedis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });

    await testRedis.set('test', 'Redis is working!');
    const value = await testRedis.get('test');
    
    res.json({ 
      status: 'connected', 
      message: 'Redis is working properly',
      testValue: value
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      message: 'Redis connection failed',
      error: error.message 
    });
  }
});

app.get("/api/scheduling-test", async (req, res) => {
  try {
    const ClassSchedule = (await import('./models/classSchedule.js')).default;
    const Attendance = (await import('./models/Attendance.js')).default;
    const SchoolConfig = (await import('./models/schoolConfig.js')).default;

    const schoolConfig = await SchoolConfig.getConfig();
    
    res.json({
      status: 'ready',
      message: 'Class scheduling system is ready',
      components: {
        models: {
          ClassSchedule: 'Loaded',
          Attendance: 'Loaded', 
          SchoolConfig: 'Loaded'
        },
        schoolConfig: {
          name: schoolConfig.name,
          geoFencing: schoolConfig.geoFencingEnabled,
          radius: schoolConfig.allowedRadius
        },
        features: {
          automatedAttendance: 'Enabled',
          geoValidation: schoolConfig.geoFencingEnabled ? 'Enabled' : 'Disabled',
          pushNotifications: 'Ready'
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Scheduling system test failed',
      error: error.message
    });
  }
});

if (process.env.NODE_ENV === 'development') {
  app.post("/api/jobs/run-manually", async (req, res) => {
    try {
      const { AttendanceJobs } = await import('./jobs/attendanceJobs.js');
      const { NotificationJobs } = await import('./jobs/notificationJobs.js');
      
      await AttendanceJobs.runAllJobsManually();
      await NotificationJobs.runAllJobsManually();
      
      res.json({
        message: 'All jobs executed manually',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        message: 'Failed to run jobs manually',
        error: error.message
      });
    }
  });
}

app.get("/api/cache-test", async (req, res) => {
  try {
    const redisModule = await import('./config/redis.js');
    const currentRedis = redisModule.default;

    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      return res.json({ 
        status: 'no_cache',
        message: 'Redis not configured - response not cached',
        data: { test: 'This response is not cached' },
        timestamp: new Date().toISOString()
      });
    }

    const cacheKey = 'cache_test_data';
    
    const cachedData = await currentRedis.get(cacheKey);
    
    if (cachedData && cachedData !== null) {
      return res.json({
        status: 'cached',
        message: 'This response came from Redis cache',
        data: cachedData,
        timestamp: new Date().toISOString()
      });
    }

    const testData = {
      message: 'This is test data that will be cached for 60 seconds',
      generatedAt: new Date().toISOString(),
      randomNumber: Math.random()
    };

    await currentRedis.setex(cacheKey, 60, testData);

    res.json({
      status: 'not_cached',
      message: 'This response was generated and cached for next time',
      data: testData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.json({
      status: 'error',
      message: 'Cache test failed, but application still works',
      error: error.message,
      data: { test: 'Fallback data' },
      timestamp: new Date().toISOString()
    });
  }
});

app.get("/api/school-config", async (req, res) => {
  try {
    const SchoolConfig = (await import('./models/schoolConfig.js')).default;
    const config = await SchoolConfig.getConfig();
    res.json({
      school: {
        name: config.name,
        coordinates: config.coordinates,
        allowedRadius: config.allowedRadius,
        geoFencingEnabled: config.geoFencingEnabled,
        requireLocationAccuracy: config.requireLocationAccuracy,
        maxLocationAccuracy: config.maxLocationAccuracy,
        geofencePolygon: config.geofencePolygon || [],
        address: config.address || {},
        defaultCheckInBuffer: config.defaultCheckInBuffer,
        defaultCheckOutBuffer: config.defaultCheckOutBuffer,
        autoMarkAbsentEnabled: config.autoMarkAbsentEnabled,
        allowedIPs: config.allowedIPs || []
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch school configuration', error: error.message });
  }
});

app.put("/api/admin/school-config", authenticate, authorize(['admin']), async (req, res) => {
  try {
    const SchoolConfig = (await import('./models/schoolConfig.js')).default;
    const config = await SchoolConfig.getConfig();
    const {
      name, coordinates, allowedRadius, geoFencingEnabled,
      requireLocationAccuracy, maxLocationAccuracy, geofencePolygon,
      address, defaultCheckInBuffer, defaultCheckOutBuffer, autoMarkAbsentEnabled,
      allowedIPs
    } = req.body;

    if (name !== undefined) config.name = name;
    if (coordinates?.lat != null) config.coordinates.lat = coordinates.lat;
    if (coordinates?.lng != null) config.coordinates.lng = coordinates.lng;
    if (allowedRadius != null) config.allowedRadius = allowedRadius;
    if (geoFencingEnabled != null) config.geoFencingEnabled = geoFencingEnabled;
    if (requireLocationAccuracy != null) config.requireLocationAccuracy = requireLocationAccuracy;
    if (maxLocationAccuracy != null) config.maxLocationAccuracy = maxLocationAccuracy;
    if (geofencePolygon !== undefined) config.geofencePolygon = geofencePolygon;
    if (address) config.address = { ...config.address.toObject?.() || config.address, ...address };
    if (defaultCheckInBuffer != null) config.defaultCheckInBuffer = defaultCheckInBuffer;
    if (defaultCheckOutBuffer != null) config.defaultCheckOutBuffer = defaultCheckOutBuffer;
    if (autoMarkAbsentEnabled != null) config.autoMarkAbsentEnabled = autoMarkAbsentEnabled;
    if (allowedIPs !== undefined) config.allowedIPs = allowedIPs;

    await config.save();
    res.json({ success: true, message: 'School configuration updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update configuration', error: error.message });
  }
});
