import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Layout from '../layout/Layout';

const ProtectedRoute = ({ allowedRoles }) => {
  const { isAuthenticated, role, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>; // Or <Spinner />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/" replace />; 
  }

  // This now correctly passes the <Outlet /> as a child to the <Layout>
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
};

export default ProtectedRoute;