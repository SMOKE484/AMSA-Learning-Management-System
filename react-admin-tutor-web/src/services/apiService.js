import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create a pre-configured axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Interceptor to automatically add the JWT token to every request
 */
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      // ✅ FIX: Add "Bearer " prefix - backend expects this format
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor to handle 401 errors globally
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear storage and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

/**
 * Logs in the user and stores token
 */
export const login = async (email, password) => {
  try {

    const response = await api.post('/auth/login', { 
      email, 
      password 
    });
    

    
    if (response.data.token && response.data.user) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    } else {
      console.error('No token or user in response:', response.data);
    }
    
    return response.data;
  } catch (err) {
    console.error('Login API error:', err.response?.data || err.message); 
    throw err.response?.data || { message: 'Login failed' };
  }
};

/**
 * Logs out the user
 */
export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

/**
 * Gets the current user from localStorage
 */
export const getCurrentUser = () => {
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  return user;
};

// Export the pre-configured axios instance to use for all other API calls
export default api;
