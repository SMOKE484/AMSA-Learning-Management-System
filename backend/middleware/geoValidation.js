import { GeoService } from '../utils/geoService.js';
import SchoolConfig from '../models/schoolConfig.js';

/**
 * Validate geo-location for attendance actions
 */
export const validateGeoLocation = async (req, res, next) => {
  try {
    const { latitude, longitude, accuracy } = req.body;

    // Check if location data is provided
    if (!latitude || !longitude) {
      return res.status(400).json({
        message: "Location data (latitude and longitude) is required"
      });
    }

    // Validate coordinate format
    if (!GeoService.isValidCoordinate(latitude, longitude)) {
      return res.status(400).json({
        message: "Invalid coordinates provided"
      });
    }

    // Get school configuration
    const schoolConfig = await SchoolConfig.getConfig();
    
    // Skip geo-validation if disabled
    if (!schoolConfig.geoFencingEnabled) {
      req.locationValidated = true;
      return next();
    }

    // Check if within school radius
    const isWithinRadius = GeoService.isWithinSchoolRadius(
      latitude,
      longitude,
      schoolConfig.coordinates.lat,
      schoolConfig.coordinates.lng,
      schoolConfig.allowedRadius
    );

    if (!isWithinRadius) {
      return res.status(403).json({
        message: "You must be within school premises to perform this action",
        details: {
          requiredRadius: `${schoolConfig.allowedRadius} meters`,
          schoolLocation: {
            lat: schoolConfig.coordinates.lat,
            lng: schoolConfig.coordinates.lng
          },
          yourLocation: { latitude, longitude }
        }
      });
    }

    // Validate location accuracy if required
    if (schoolConfig.requireLocationAccuracy && accuracy) {
      const isAccurate = GeoService.validateLocationAccuracy(
        accuracy, 
        schoolConfig.maxLocationAccuracy
      );

      if (!isAccurate) {
        return res.status(403).json({
          message: "Location accuracy is too low. Please enable high accuracy mode",
          details: {
            maxAllowedAccuracy: `${schoolConfig.maxLocationAccuracy} meters`,
            yourAccuracy: `${accuracy} meters`
          }
        });
      }
    }

    // Store validation result for logging
    req.locationValidated = true;
    req.locationData = {
      latitude,
      longitude,
      accuracy,
      validatedAt: new Date()
    };

    next();
  } catch (error) {
    console.error("Geo-validation error:", error);
    res.status(500).json({
      message: "Location validation failed",
      error: error.message
    });
  }
};

/**
 * Validate device information for anti-cheating
 */
export const validateDevice = async (req, res, next) => {
  try {
    const { deviceInfo, ipAddress } = req.body;

    // Basic device validation
    if (!deviceInfo) {
      return res.status(400).json({
        message: "Device information is required"
      });
    }

    // Store device info for logging and analytics
    req.deviceData = {
      deviceInfo: deviceInfo.substring(0, 200), // Limit length
      ipAddress: ipAddress || req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date()
    };

    // TODO: Implement more advanced device fingerprinting
    // - Check for suspicious patterns
    // - Rate limiting per device
    // - Location spoofing detection

    next();
  } catch (error) {
    console.error("Device validation error:", error);
    res.status(500).json({
      message: "Device validation failed",
      error: error.message
    });
  }
};

/**
 * Rate limiting for attendance actions
 */
export const attendanceRateLimit = (req, res, next) => {
  // Simple in-memory rate limiting (in production, use Redis)
  const rateLimitWindow = 60000; // 1 minute
  const maxRequests = 5; // 5 requests per minute
  
  const clientIp = req.ip;
  const now = Date.now();
  
  // Initialize rate limit storage if not exists
  if (!req.app.locals.rateLimit) {
    req.app.locals.rateLimit = new Map();
  }

  const clientData = req.app.locals.rateLimit.get(clientIp) || {
    count: 0,
    resetTime: now + rateLimitWindow
  };

  // Reset counter if window has passed
  if (now > clientData.resetTime) {
    clientData.count = 0;
    clientData.resetTime = now + rateLimitWindow;
  }

  // Check if over limit
  if (clientData.count >= maxRequests) {
    return res.status(429).json({
      message: "Too many attendance attempts. Please try again later.",
      retryAfter: Math.ceil((clientData.resetTime - now) / 1000)
    });
  }

  // Increment counter
  clientData.count++;
  req.app.locals.rateLimit.set(clientIp, clientData);

  next();
};

/**
 * Log attendance attempts for security monitoring
 */
export const logAttendanceAttempt = async (req, res, next) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    // Log the attempt after response is sent
    setTimeout(async () => {
      try {
        const logData = {
          userId: req.userId,
          role: req.role,
          action: req.method + ' ' + req.route?.path,
          classId: req.params.classId,
          success: res.statusCode < 400,
          statusCode: res.statusCode,
          locationValidated: req.locationValidated || false,
          deviceData: req.deviceData,
          locationData: req.locationData,
          timestamp: new Date()
        };

        // In production, you would save this to a database
        console.log(' Attendance attempt logged:', logData);

        // TODO: Save to database for analytics and security monitoring
        // await AttendanceLog.create(logData);

      } catch (error) {
        console.error('Attendance logging error:', error);
      }
    }, 0);

    originalSend.call(this, data);
  };

  next();
};
