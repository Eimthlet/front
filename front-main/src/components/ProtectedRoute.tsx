import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { CircularProgress, Box } from '@mui/material';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredAdmin?: boolean;
}

export default function ProtectedRoute({ 
  children, 
  requiredAdmin = false 
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
  if (requiredAdmin && !user.isAdmin) {
    return <Navigate to="/quiz" replace />;
  }

  // If user is an admin and tries to access user-specific routes, redirect to admin panel
  if (user.isAdmin && !requiredAdmin && (location.pathname === '/quiz' || location.pathname === '/')) {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
}
