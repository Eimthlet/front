import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { CircularProgress, Box } from '@mui/material';

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
}

export default function ProtectedRoute({ 
  children, 
  adminOnly = false 
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh' 
      }}>
        <CircularProgress />
      </Box>
    );
  }

  // If no user is logged in, redirect to login and save the attempted path
  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // If route is admin-only and user is not an admin, redirect to quiz
  if (adminOnly && user.role !== 'admin') {
    return <Navigate to="/quiz" replace />;
  }

  // If user is an admin and tries to access a non-admin route, redirect to admin panel
  if (user.role === 'admin' && !adminOnly && location.pathname !== '/admin') {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
}
