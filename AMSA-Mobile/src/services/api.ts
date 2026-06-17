import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';


const API_URL = 'https://amsa-learning-management-system-production.up.railway.app/api';

let _onUnauthenticated: (() => void) | null = null;

export const registerUnauthenticatedHandler = (handler: () => void) => {
  _onUnauthenticated = handler;
};


export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request interceptor
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log(`[API] → ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`, token ? '(token attached)' : '(NO TOKEN)');
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    console.error('Response error:', {
      url: error.config?.url,
      status: error.response?.status,
      message: error.message,
      code: error.code
    });
    if (error.response?.status === 401) {
      _onUnauthenticated?.();
    }
    return Promise.reject(error);
  }
);