import React, { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import api from '../utils/api';
import { AUTH_CONFIG } from '../config';

// Define User and AuthContextType interfaces locally
interface User {
  id: number;
  email: string;
  isAdmin: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
  clearError: () => void;
}

interface RegisterData {
  email: string;
  password: string;
}

// Define types
interface AuthResponse {
  token: string;
  refreshToken: string;
  success?: boolean;
}

interface TokenCheckResponse {
  success: boolean;
  valid: boolean;
  user?: {
    id: number;
    email: string;
    isAdmin: boolean;
  };
  error?: string;
}

// Define JWT payload type
interface JwtPayload {
  id: number;
  email: string;
  isAdmin?: boolean;
  exp?: number;
}

// Create the context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshTokenAndUpdateUser = async () => {
    try {
      // Call refresh endpoint without sending the token (it will be sent via cookies)
      await api.post<AuthResponse>('/api/auth/refresh', {}, { withCredentials: true });
      
      // After successful token refresh, check token validity to get user info
      const response = await api.get<TokenCheckResponse>('/api/auth/check-token', { withCredentials: true });
      
      if (response.data.valid && response.data.user) {
        const userData = response.data.user;
        setUser({
          id: userData.id,
          email: userData.email,
          isAdmin: userData.isAdmin
        });
        setIsAuthenticated(true);
        setIsAdmin(userData.isAdmin);
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      setUser(null);
      setIsAuthenticated(false);
      setIsAdmin(false);
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Don't try to check token on initial load - this can cause CORS issues
        // Just set loading to false and let the user log in manually
        console.log('Auth initialized - user needs to log in');
      } catch (error) {
        console.error('Auth initialization failed:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    setError(null);
    try {
      await api.post<AuthResponse>('/api/auth/login', { email, password }, { withCredentials: true });
      
      // After successful login, check token validity to get user info
      const response = await api.get<TokenCheckResponse>('/api/auth/check-token', { withCredentials: true });
      
      if (response.data.valid && response.data.user) {
        const userData = response.data.user;
        setUser({
          id: userData.id,
          email: userData.email,
          isAdmin: userData.isAdmin
        });
        setIsAuthenticated(true);
        setIsAdmin(userData.isAdmin);
      }
    } catch (error) {
      handleApiError(error, 'Login failed');
    }
  };

  const register = async (userData: RegisterData): Promise<void> => {
    setError(null);
    try {
      await api.post<AuthResponse>('/api/auth/register', userData, { withCredentials: true });
      
      // After successful registration, check token validity to get user info
      const response = await api.get<TokenCheckResponse>('/api/auth/check-token', { withCredentials: true });
      
      if (response.data.valid && response.data.user) {
        const userData = response.data.user;
        setUser({
          id: userData.id,
          email: userData.email,
          isAdmin: userData.isAdmin
        });
        setIsAuthenticated(true);
        setIsAdmin(userData.isAdmin);
      }
    } catch (error) {
      handleApiError(error, 'Registration failed');
    }
  };

  const logout = async (): Promise<void> => {
    setError(null);
    try {
      await api.post('/api/auth/logout', {}, { withCredentials: true });
      setUser(null);
      setIsAuthenticated(false);
      setIsAdmin(false);
    } catch (error) {
      // Even if the server call fails, we still want to clear the local state
      console.error('Logout error:', error);
      setUser(null);
      setIsAuthenticated(false);
      setIsAdmin(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  const handleApiError = (error: any, defaultMessage: string) => {
    console.error(defaultMessage, error);
    
    // Extract the error message from the API response if available
    let userFriendlyMessage = defaultMessage;
    
    if (error.response?.data?.error) {
      // Handle specific error cases with user-friendly messages
      const apiErrorMessage = error.response.data.error;
      
      if (apiErrorMessage.includes('Invalid email or password')) {
        userFriendlyMessage = 'The email or password you entered is incorrect. Please try again.';
      } else if (apiErrorMessage.includes('Email already registered')) {
        userFriendlyMessage = 'This email is already registered. Please use a different email or try logging in.';
      } else if (apiErrorMessage.includes('Username already taken')) {
        userFriendlyMessage = 'This username is already taken. Please choose a different username.';
      } else if (apiErrorMessage.includes('Token expired')) {
        userFriendlyMessage = 'Your session has expired. Please log in again.';
      } else if (apiErrorMessage.includes('No token provided')) {
        userFriendlyMessage = 'You need to log in to access this feature.';
      } else {
        // Use the API error message but make it more user-friendly
        userFriendlyMessage = apiErrorMessage.charAt(0).toUpperCase() + apiErrorMessage.slice(1);
      }
    } else if (error.message === 'Network Error') {
      userFriendlyMessage = 'Unable to connect to the server. Please check your internet connection and try again.';
    } else if (error.message?.includes('timeout')) {
      userFriendlyMessage = 'The server is taking too long to respond. Please try again later.';
    }
    
    setError(userFriendlyMessage);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isAdmin,
        isLoading,
        login,
        register,
        logout,
        error,
        clearError
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use the auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
