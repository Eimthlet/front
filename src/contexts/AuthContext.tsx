import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { apiClient, ApiResponse } from '../utils/apiNew';

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
    role?: string;
  };
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
      console.log('Attempting login with email:', email);
      
      // Clear any existing tokens
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      
      // Use apiClient for login
      const loginResponse = await apiClient.post<AuthResponse>('/api/auth/login', { email, password });
      
      if (loginResponse.error) {
        throw new Error(loginResponse.error);
      }
      
      console.log('Login response:', loginResponse.data);
      
      // Store tokens in localStorage
      if (loginResponse.data?.token) {
        localStorage.setItem('token', loginResponse.data.token);
        console.log('Token stored in localStorage');
        
        // Set the auth token in the API client
        apiClient.setAuthToken(loginResponse.data.token);
      }
      
      if (loginResponse.data?.refreshToken) {
        localStorage.setItem('refreshToken', loginResponse.data.refreshToken);
        console.log('Refresh token stored in localStorage');
      }
      
      // Get user info after successful login
      const userResponse = await apiClient.get<TokenCheckResponse>('/api/auth/check-token');
      
      if (userResponse.error) {
        throw new Error(userResponse.error);
      }
      
      if (userResponse.data?.user) {
        const userData = userResponse.data.user;
        const isAdminUser = Boolean(userData.isAdmin || userData.role === 'admin');
        
        const userInfo: User = {
          id: userData.id,
          email: userData.email,
          isAdmin: isAdminUser,
          role: userData.role || 'user'
        };
        
        console.log('User data from check-token:', userInfo);
        
        setUser(userInfo);
        setIsAuthenticated(true);
        setIsAdmin(isAdminUser);
        
        // Navigate to home or dashboard after successful login
        navigate('/');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      let errorMessage = 'Login failed. Please try again.';
      
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      throw error;
    }
  };
  
  // Register function
  const register = async (userData: RegisterData): Promise<void> => {
    setError(null);
    try {
      const response = await apiClient.post<AuthResponse>('/api/auth/register', userData);
      if (response.error) {
        throw new Error(response.error);
      }
      // After successful registration, log the user in
      await login(userData.email, userData.password);
    } catch (error: any) {
      console.error('Registration error:', error);
      let errorMessage = 'Registration failed. Please try again.';
      
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
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
      navigate('/login');
    }
  };
  
  // Initialize auth state
  const initializeAuth = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setIsLoading(false);
        return;
      }
      
      // Set the token in the API client
      apiClient.setAuthToken(token);
      
      // Check if token is valid and get user info
      const response = await apiClient.get<TokenCheckResponse>('/api/auth/check-token');
      
      if (response.error || !response.data?.valid || !response.data.user) {
        throw new Error(response.error || 'Invalid token');
      }
      
      const userData = response.data.user;
      const isAdminUser = Boolean(userData.isAdmin || userData.role === 'admin');
      
      setUser({
        id: userData.id,
        email: userData.email,
        isAdmin: isAdminUser,
        role: userData.role || 'user'
      });
      
      setIsAuthenticated(true);
      setIsAdmin(isAdminUser);
      
    } catch (error) {
      console.error('Auth initialization error:', error);
      // Clear invalid tokens
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      setUser(null);
      setIsAuthenticated(false);
      setIsAdmin(false);
    } finally {
      setIsLoading(false);
    }
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
