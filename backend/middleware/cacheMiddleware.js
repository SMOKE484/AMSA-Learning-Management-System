import redis from '../config/redis.js';

// Helper to check if Redis is actually working
const isRedisAvailable = () => {
  return !!(
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN
  );
};

// Generic cache middleware
export const cache = (expireSeconds = 300) => {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Skip caching if Redis is not available
    if (!isRedisAvailable()) {
      return next();
    }

    const key = `cache:${req.originalUrl}`;

    try {
      // Try to get cached data
      const cachedData = await redis.get(key);
      
      if (cachedData) {
        console.log('Serving from cache:', key);
        return res.json(cachedData); 
      }

      // Override res.json to cache the response
      const originalJson = res.json;
      res.json = function(data) {
        // Cache the response (non-blocking)
        if (isRedisAvailable()) {
          redis.setex(key, expireSeconds, data) 
            .catch(err => console.error('Redis set error:', err));
        }
        
        // Call original json method
        originalJson.call(this, data);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next(); // Continue without caching if Redis fails
    }
  };
};

// Invalidate cache by pattern
export const invalidateCache = async (pattern) => {
  if (!isRedisAvailable()) {
    return; // Skip if Redis not available
  }

  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
      console.log(`Invalidated cache: ${pattern}`);
    }
  } catch (error) {
    console.error('Cache invalidation error:', error);
  }
};

// Specific cache invalidators
export const invalidateStudentCache = (studentId = null) => {
  if (studentId) {
    return invalidateCache(`cache:*students*${studentId}*`);
  }
  return invalidateCache('cache:*students*');
};

export const invalidateTutorCache = (tutorId = null) => {
  if (tutorId) {
    return invalidateCache(`cache:*tutors*${tutorId}*`);
  }
  return invalidateCache('cache:*tutors*');
};

export const invalidateNotesCache = () => {
  return invalidateCache('cache:*notes*');
};

export const invalidateMarksCache = () => {
  return invalidateCache('cache:*marks*');
};