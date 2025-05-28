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
  user?: {
    id: number;
    email: string;
    isAdmin?: boolean;
    role?: string;
  };
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
      const loginResponse = await api.post<AuthResponse>('/api/auth/login', { email, password }, { withCredentials: true });
      
      // Store tokens in localStorage if they're in the response
      if (loginResponse.data.token) {
        localStorage.setItem('token', loginResponse.data.token);
      }
      
      if (loginResponse.data.refreshToken) {
        localStorage.setItem('refreshToken', loginResponse.data.refreshToken);
      }
      
      // If user info is in the login response, use it directly
      if (loginResponse.data.user) {
        const userData = loginResponse.data.user;
        setUser({
          id: userData.id,
          email: userData.email,
          isAdmin: userData.isAdmin || userData.role === 'admin'
        });
        setIsAuthenticated(true);
        setIsAdmin(userData.isAdmin || userData.role === 'admin');
        return;
      }
      
      // Otherwise, check token validity to get user info
      const response = await api.get<TokenCheckResponse>('/api/auth/check-token', { 
        withCredentials: true,
        headers: {
          'Authorization': `Bearer ${loginResponse.data.token}`
        }
      });
      
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
    
    // Check if the error is from our updated API format
    if (error.message && typeof error.message === 'string') {
      userFriendlyMessage = error.message;
    }
    
    // If there's a response with error data, prioritize that
    if (error.response?.data?.error) {
      userFriendlyMessage = error.response.data.error;
    }
    
    // For specific error codes, provide even more user-friendly messages
    if (error.response?.data?.code) {
      const errorCode = error.response.data.code;
      
      switch(errorCode) {
        case 'INVALID_CREDENTIALS':
          userFriendlyMessage = 'The email or password you entered is incorrect. Please try again.';
          break;
        case 'TOKEN_EXPIRED':
          userFriendlyMessage = 'Your session has expired. Please log in again.';
          break;
        case 'INVALID_TOKEN':
          userFriendlyMessage = 'Your session is invalid. Please log in again.';
          break;
        case 'ACCOUNT_SUSPENDED':
          userFriendlyMessage = 'Your account has been temporarily suspended. Please contact support.';
          break;
      }
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
