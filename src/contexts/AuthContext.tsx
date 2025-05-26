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

  const handleApiError = (error: any, message: string) => {
    setError(message);
    console.error(message, error);
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
