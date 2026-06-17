// src/context/AuthContext.tsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '../services/auth';
import { registerUnauthenticatedHandler } from '../services/api';
import { registerForPushNotificationsAsync } from '../utils/notifications';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      console.log('🔍 Checking auth status...');
      const isAuth = await authService.isAuthenticated();
      if (isAuth) {
        const currentUser = await authService.getCurrentUser();
        const storedToken = await AsyncStorage.getItem('token');
        setUser(currentUser);
        setToken(storedToken);
        console.log('✅ User authenticated:', currentUser);
        registerForPushNotificationsAsync().catch(() => {});
      } else {
        console.log('❌ No user authenticated');
      }
    } catch (error) {
      console.error('❌ Auth check error:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      console.log('👤 Login attempt for:', email);
      const data = await authService.login(email, password);
      setUser(data.user);
      setToken(data.token);
      console.log('🎉 Login successful:', data.user);
      registerForPushNotificationsAsync().catch(() => {});
    } catch (error: any) {
      console.error('💥 Login context error:', error);

      if (error.response) {
        const message = error.response.data?.message || 'Login failed';
        Alert.alert('Login Failed', message);
      } else if (error.request) {
        Alert.alert(
          'Connection Error',
          'Cannot connect to server. Please check:\n\n• Your internet connection\n• Server is running\n• Correct API URL'
        );
      } else {
        Alert.alert('Error', 'An unexpected error occurred');
      }

      throw error;
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      setUser(null);
      setToken(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  useEffect(() => {
    registerUnauthenticatedHandler(logout);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    isAuthenticated: !!user && !!token,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
