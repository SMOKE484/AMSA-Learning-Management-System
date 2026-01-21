import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
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
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  credentials: false
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
      const SchoolConfig = (await import('./models/SchoolConfig.js')).default;
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
    const SchoolConfig = (await import('./models/SchoolConfig.js')).default;

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
    const SchoolConfig = (await import('./models/SchoolConfig.js')).default;
    const config = await SchoolConfig.getConfig();
    
    res.json({
      school: {
        name: config.name,
        coordinates: config.coordinates,
        allowedRadius: config.allowedRadius,
        geoFencingEnabled: config.geoFencingEnabled,
        address: config.fullAddress
      }
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to fetch school configuration',
      error: error.message
    });
  }
});