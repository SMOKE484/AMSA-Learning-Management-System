import { Redis } from '@upstash/redis';

let redis = null;
let initializationAttempted = false;

const initializeRedis = () => {
  if (initializationAttempted) return redis;
  
  initializationAttempted = true;
  
  try {
    // Check if environment variables are available
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!redisUrl || !redisToken) {
      console.warn('⚠️  Redis environment variables not set. Caching will be disabled.');
      return null;
    }

    // Validate URL format
    if (!redisUrl.startsWith('http')) {
      console.warn('⚠️  Invalid Redis URL format. Caching will be disabled.');
      return null;
    }

    const redisInstance = new Redis({
      url: redisUrl,
      token: redisToken,
    });
    
    console.log('Redis connected successfully');
    redis = redisInstance;
    return redis;
  } catch (error) {
    console.error('Redis connection failed:', error.message);
    redis = null;
    return null;
  }
};

// Create a getter that initializes on first access
export default {
  get: async (key) => {
    const instance = initializeRedis();
    return instance ? instance.get(key) : null;
  },
  set: async (key, value) => {
    const instance = initializeRedis();
    return instance ? instance.set(key, value) : null;
  },
  setex: async (key, seconds, value) => {
    const instance = initializeRedis();
    return instance ? instance.setex(key, seconds, value) : null;
  },
  del: async (...keys) => {
    const instance = initializeRedis();
    return instance ? instance.del(...keys) : null;
  },
  keys: async (pattern) => {
    const instance = initializeRedis();
    return instance ? instance.keys(pattern) : [];
  }
};