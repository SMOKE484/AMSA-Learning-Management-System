import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';


const API_URL = 'https://amsa-learning-management-system-production.up.railway.app/api';


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
    return Promise.reject(error);
  }
);