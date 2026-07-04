// src/services/auth.ts
import { api } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types';

export const authService = {
  async login(email: string, password: string) {
    try {
      if (__DEV__) console.log('🔐 Attempting login with:', { email });

      const response = await api.post('/auth/login', { email, password });

      if (__DEV__) console.log('✅ Login response:', response.data);

      if (response.data.token && response.data.user) {
        await AsyncStorage.setItem('token', response.data.token);
        await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
        if (__DEV__) console.log('💾 Token and user saved to storage');
      } else {
        if (__DEV__) console.warn('⚠️ No token or user in response');
      }

      return response.data;
    } catch (error: any) {
      if (__DEV__) console.error('❌ Login service error:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      throw error;
    }
  },

  async logout() {
    if (__DEV__) console.log('🚪 Logging out...');
    await AsyncStorage.multiRemove(['token', 'user']);
  },

  async getCurrentUser(): Promise<User | null> {
    try {
      const userStr = await AsyncStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      if (__DEV__) console.log('👤 Current user from storage:', user);
      return user;
    } catch (error) {
      if (__DEV__) console.error('❌ Error getting current user:', error);
      return null;
    }
  },

  async isAuthenticated(): Promise<boolean> {
    try {
      const token = await AsyncStorage.getItem('token');
      const isAuth = !!token;
      if (__DEV__) console.log('🔍 Auth check - token exists:', isAuth);
      return isAuth;
    } catch (error) {
      if (__DEV__) console.error('❌ Error checking authentication:', error);
      return false;
    }
  },
};
