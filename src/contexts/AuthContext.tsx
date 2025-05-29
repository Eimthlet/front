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
}

interface TokenCheckResponse {
  user?: User;
  error?: string;
}

interface JwtPayload {
  id: number;
  email: string;
  isAdmin?: boolean;
  role?: string;
  exp?: number;
}

interface ApiResponse<T> {
  data: T;
  error?: string;
}

interface AuthEndpointsResponse {
  paths: string[];
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
      // Verify login endpoint exists
      const response = await apiClient.get<AuthEndpointsResponse>('/api/auth');
      if (!response.data.paths.includes('/login')) {
        throw new Error('Login service currently unavailable');
      }
      
      const authResponse = await apiClient.post<ApiResponse<AuthResponse>>('/api/auth/login', { email, password });
      
      if (authResponse.data.error) {
        throw new Error(authResponse.data.error);
      }
      
      const { token, refreshToken, user: userData } = authResponse.data.data;
      
      console.log('Login response:', authResponse.data.data);
      
      // Store tokens in localStorage
      if (token) {
        localStorage.setItem('token', token);
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
      
      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
      }
      
      // Set user state
      if (userData) {
        setUser({
          id: userData.id,
          email,
          isAdmin: userData.isAdmin || false,
          role: userData.role
        });
        
        setIsAuthenticated(true);
        setIsAdmin(userData.isAdmin || false);
        navigate('/');
      } else {
        throw new Error('User data not found in response');
      }
    } catch (err) {
      if (err.response?.status === 404) {
        throw new Error('Login service currently unavailable');
      }
      const error = handleApiError(err);
      setError(error.message);
      throw error;
    }
  };
  
  // Register function
  const register = async (userData: RegisterData): Promise<void> => {
    setError(null);
    try {
      // Verify register endpoint exists
      const response = await apiClient.get<AuthEndpointsResponse>('/api/auth');
      if (!response.data.paths.includes('/register')) {
        throw new Error('Register service currently unavailable');
      }
      
      const registerResponse = await apiClient.post<ApiResponse<AuthResponse>>('/api/auth/register', userData);
      
      if (registerResponse.data.error) {
        throw new Error(registerResponse.data.error);
      }
      
      const { token, refreshToken, user: registeredUser } = registerResponse.data.data;
      
      if (registeredUser) {
        // After successful registration, log the user in
        await login(userData.email, userData.password);
      } else {
        throw new Error('User data not found in response');
      }
    } catch (err) {
      if (err.response?.status === 404) {
        throw new Error('Register service currently unavailable');
      }
      const error = handleApiError(err);
      setError(error.message);
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
        const checkTokenResponse = await checkToken();
        if (checkTokenResponse.error) {
          throw new Error(checkTokenResponse.error);
        }
        
        const data = checkTokenResponse;
        
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
  
  const checkToken = async (): Promise<TokenCheckResponse> => {
    try {
      // First verify endpoint exists
      const response = await apiClient.get<AuthEndpointsResponse>('/api/auth');
      if (!response.data.paths.includes('/check-token')) {
        return { error: 'Authentication service unavailable' };
      }
      
      const tokenResponse = await apiClient.get<TokenCheckResponse>('/api/auth/check-token');
      return tokenResponse.data;
    } catch (err) {
      if (err.response?.status === 404) {
        return { error: 'Authentication service unavailable' };
      }
      return { error: handleApiError(err).message };
    }
  };

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
