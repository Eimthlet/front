import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../utils/apiClient';
import { handleApiError } from '../utils/apiErrorHandler';

// Define User and AuthContextType interfaces locally
interface User {
  id: number;
  email: string;
  isAdmin: boolean;
  role?: string;
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
  refreshToken?: string;
  user?: {
    id: number;
    email: string;
    isAdmin: boolean;
    role?: string;
  };
  error?: string;
}

interface TokenCheckResponse {
  user?: User;
  error?: string;
}

// Define JWT payload type
interface JwtPayload {
  id: number;
  email: string;
  isAdmin?: boolean;
  role?: string;
  exp?: number;
}

// Create the context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  // State management
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Navigation
  const navigate = useNavigate();
  
  // Clear error function
  const clearError = useCallback(() => {
    setError(null);
  }, []);
  
  // Login function
  const login = async (email: string, password: string): Promise<void> => {
    setError(null);
    try {
      const response = await apiClient.post<AuthResponse>('/api/auth/login', { email, password });
      const data = response.data;
      
      console.log('Login response:', data);
      
      // Store tokens in localStorage
      if (data.token) {
        localStorage.setItem('token', data.token);
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
      }
      
      if (data.refreshToken) {
        localStorage.setItem('refreshToken', data.refreshToken);
      }
      
      // Set user state
      if (data.user) {
        setUser({
          id: data.user.id,
          email,
          isAdmin: data.user.isAdmin || false,
          role: data.user.role
        });
        
        setIsAuthenticated(true);
        setIsAdmin(data.user.isAdmin || false);
        navigate('/');
      } else {
        throw new Error('User data not found in response');
      }
    } catch (error) {
      const apiError = handleApiError(error);
      setError(apiError.message);
      throw error;
    }
  };
  
  // Register function
  const register = async (userData: RegisterData): Promise<void> => {
    setError(null);
    try {
      const response = await apiClient.post<AuthResponse>('/api/auth/register', userData);
      const data = response.data;
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      // After successful registration, log the user in
      await login(userData.email, userData.password);
    } catch (error) {
      const apiError = handleApiError(error);
      setError(apiError.message);
      throw error;
    }
  };
  
  // Logout function
  const logout = async (): Promise<void> => {
    try {
      await apiClient.post('/api/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear user state and tokens regardless of API call success
      setUser(null);
      setIsAuthenticated(false);
      setIsAdmin(false);
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      delete apiClient.defaults.headers.common['Authorization'];
      navigate('/login');
    }
  };
  
  // Initialize auth state
  const initializeAuth = useCallback(async () => {
    setIsLoading(true);
    const token = localStorage.getItem('token');
    
    if (token) {
      try {
        const response = await apiClient.get<TokenCheckResponse>('/api/auth/check-token');
        const data = response.data;
        
        if (data.error || !data.user) {
          throw new Error(data.error || 'Invalid token');
        }
        
        const isAdminUser = Boolean(data.user.isAdmin || data.user.role === 'admin');
        
        setUser(data.user);
        setIsAuthenticated(true);
        setIsAdmin(isAdminUser);
        
        // Set auth token for subsequent requests
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      } catch (error) {
        console.error('Token validation error:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
      }
    }
    setIsLoading(false);
  }, []);
  
  // Initialize auth state on mount
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // Define the context value
  const contextValue: AuthContextType = {
    user,
    isAuthenticated,
    isAdmin,
    isLoading,
    login,
    register,
    logout,
    error,
    clearError,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use the auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
