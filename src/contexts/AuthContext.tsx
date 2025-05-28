import React, { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';
import api from '../utils/api';
import { AUTH_CONFIG, API_CONFIG } from '../config';

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
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshTokenAndUpdateUser = async () => {
    try {
      // Call refresh endpoint without sending the token (it will be sent via cookies)
      const refreshResponse = await api.post<AuthResponse>(
        '/api/auth/refresh', 
        {}, 
        { withCredentials: true }
      );
      
      console.log('Token refresh response:', refreshResponse.data);
      
      // After successful token refresh, check token validity to get user info
      const response = await api.get<TokenCheckResponse>('/api/auth/check-token', { 
        withCredentials: true 
      });
      
      console.log('Token check response after refresh:', response.data);
      
      if (response.data.valid && response.data.user) {
        const userData = response.data.user;
        const isAdminUser = userData.isAdmin || userData.role === 'admin';
        
        const userInfo = {
          id: userData.id,
          email: userData.email,
          isAdmin: isAdminUser,
          role: userData.role || 'user'
        };
        
        console.log('Setting user state:', userInfo);
        
        setUser(userInfo);
        setIsAuthenticated(true);
        setIsAdmin(isAdminUser);
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
      console.log('Attempting login with email:', email);
      
      // Clear any existing tokens
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      
      // Use axios directly to avoid interceptors for this critical request
      const loginResponse = await axios.post<AuthResponse>(
        `${API_CONFIG.BASE_URL}/api/auth/login`, 
        { email, password }, 
        { 
          withCredentials: true, // Important for cookies
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          timeout: 10000 // 10 second timeout
        }
      );
      
      console.log('Login response:', {
        status: loginResponse.status,
        statusText: loginResponse.statusText,
        data: loginResponse.data,
        headers: loginResponse.headers
      });
      
      // Store tokens in localStorage if they're in the response
      if (loginResponse.data.token) {
        localStorage.setItem('token', loginResponse.data.token);
        console.log('Token stored in localStorage');
      }
      
      if (loginResponse.data.refreshToken) {
        localStorage.setItem('refreshToken', loginResponse.data.refreshToken);
        console.log('Refresh token stored in localStorage');
      }
      
      // If user info is in the login response, use it directly
      if (loginResponse.data.user) {
        const userData = loginResponse.data.user;
        const isAdminUser = Boolean(userData.isAdmin || userData.role === 'admin');
        const userRole = userData.role || 'user';
        
        const userInfo = {
          id: userData.id,
          email: userData.email,
          isAdmin: isAdminUser,
          role: userRole
        };
        
        console.log('User data from login response:', userInfo);
        
        setUser(userInfo);
        setIsAuthenticated(true);
        setIsAdmin(isAdminUser);
        
        console.log('User state updated:', userInfo);
        return;
      }
      
      // Otherwise, check token validity to get user info
      console.log('No user data in login response, checking token validity...');
      const response = await axios.get<TokenCheckResponse>(
        `${API_CONFIG.BASE_URL}/api/auth/check-token`, 
        { 
          withCredentials: true,
          headers: {
            'Authorization': `Bearer ${loginResponse.data.token}`,
            'Accept': 'application/json'
          }
        }
      );
      
      console.log('Token check response:', response.data);
      
      if (response.data.valid && response.data.user) {
        const userData = response.data.user;
        const isAdminUser = Boolean(userData.isAdmin || userData.role === 'admin');
        const userRole = userData.role || 'user';
        
        const userInfo = {
          id: userData.id,
          email: userData.email,
          isAdmin: isAdminUser,
          role: userRole
        };
        
        console.log('User data from token check:', userInfo);
        
        setUser(userInfo);
        setIsAuthenticated(true);
        setIsAdmin(isAdminUser);
        
        console.log('User state updated from token check:', userInfo);
      }
    } catch (error) {
      handleApiError(error, 'Login failed');
    }
  };

  const register = async (userData: RegisterData): Promise<void> => {
    setError(null);
    try {
      const registerResponse = await api.post<AuthResponse>('/api/auth/register', userData, { 
        withCredentials: true 
      });
      
      console.log('Registration response:', registerResponse.data);
      
      // After successful registration, check token validity to get user info
      const response = await api.get<TokenCheckResponse>('/api/auth/check-token', { 
        withCredentials: true 
      });
      
      if (response.data.valid && response.data.user) {
        const userData = response.data.user;
        const isAdminUser = Boolean(userData.isAdmin || userData.role === 'admin');
        const userRole = userData.role || 'user';
        
        const userInfo = {
          id: userData.id,
          email: userData.email,
          isAdmin: isAdminUser,
          role: userRole
        };
        
        console.log('User data after registration:', userInfo);
        
        setUser(userInfo);
        setIsAuthenticated(true);
        setIsAdmin(isAdminUser);
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
