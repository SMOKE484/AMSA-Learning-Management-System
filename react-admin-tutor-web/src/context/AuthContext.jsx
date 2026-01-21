import React, { createContext, useState, useEffect } from 'react';
import { getCurrentUser, logout as apiLogout } from '../services/apiService';

// 1. Create the context
export const AuthContext = createContext(null);

// 2. Create the provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // Loading state

// In AuthContext.jsx - update the useEffect
useEffect(() => {
  const initializeAuth = () => {
    try {

      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      
      if (token && userStr) {
        const user = JSON.parse(userStr);
        setUser(user);
      } else {
        setUser(null);
      }
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  initializeAuth();
}, []);

  // 4. Login function
  const loginUser = (userData) => {
    setUser(userData.user);
    // The token is already set in localStorage by apiService.js
  };

  // 5. Logout function
  const logoutUser = () => {
    apiLogout();
    setUser(null);
  };

  // 6. Value to be passed to consumers
  const value = {
    user,
    isAuthenticated: !!user,
    role: user?.role,
    loading,
    loginUser,
    logoutUser,
  };

  // Don't render children until we've checked for a user
  if (loading) {
    return <div>Loading app...</div>; // Or a full-page spinner
  }
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};