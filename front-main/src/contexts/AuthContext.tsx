import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/apiClient';
import { handleApiError } from '../utils/apiErrorHandler';

// Define User and AuthContextType interfaces locally
interface User {
  id: number;
  email: string;
  isAdmin: boolean;
  role?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  error: string | null;
}

// Represents the actual login response data structure
interface LoginResponse {
  success: boolean;
  token: string;
  refreshToken?: string;
  user: User;
  error?: string;
}

// The login response comes directly from the API
type LoginData = LoginResponse;

interface TokenCheckResponse {
  success: boolean;
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
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface AuthEndpointsResponse {
  status: string;
  endpoints: string[];
  data?: any;
  message?: string;
}

interface ApiStatusResponse {
  status: string;
  data?: any;
}

// Combined type for the context value, including state and action dispatchers
interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

interface RegisterData {
  email: string;
  password: string;
  // Add other fields like username, firstName, lastName if your registration form collects them
}

// Create the context
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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
      const response = await api.post<LoginResponse>('/auth/login', { email, password });

      if (!response.success || !response.token || !response.user) {
        throw new Error(response.error || 'Login failed: Invalid response from server.');
      }
      
      localStorage.setItem('token', response.token);
      if (response.refreshToken) {
        localStorage.setItem('refreshToken', response.refreshToken);
      }
      
      const { user } = response;
      setUser(user);
      setIsAuthenticated(true);
      setIsAdmin(user.isAdmin);
      
      navigate(user.isAdmin ? '/admin' : '/quiz');
    } catch (error: any) {
      const normalizedError = handleApiError(error);
      setError(normalizedError.message);
      throw normalizedError;
    }
  };
  
  // Register function
  const register = async (userData: RegisterData): Promise<void> => {
    setError(null);
    try {
      const response = await api.post<LoginResponse>('/auth/register', userData);

      if (!response.success || !response.token || !response.user) {
        throw new Error(response.error || 'Registration failed: Invalid response from server.');
      }

      localStorage.setItem('token', response.token);
      if (response.refreshToken) {
        localStorage.setItem('refreshToken', response.refreshToken);
      }

      const { user } = response;
      setUser(user);
      setIsAuthenticated(true);
      setIsAdmin(user.isAdmin);

      navigate(user.isAdmin ? '/admin' : '/quiz');

    } catch (error: any) {
      const normalizedError = handleApiError(error);
      setError(normalizedError.message);
      throw normalizedError;
    }
  };

  // Logout function
  const logout = async (): Promise<void> => {
    try {
      await api.post('/auth/logout');
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      setUser(null);
      setIsAuthenticated(false);
      setIsAdmin(false);
      navigate('/login');
    } catch (error: any) {
      console.error('Logout error:', error);
      // Still clear local state even if server logout fails
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      setUser(null);
      setIsAuthenticated(false);
      setIsAdmin(false);
      navigate('/login');
    }
  };

  // Check token function
  const checkToken = async (): Promise<TokenCheckResponse> => {
    try {
      const response = await api.get<TokenCheckResponse>('/auth/check-token');
      return response;
    } catch (error: any) {
      console.error('Token check error details:', error);
      return { success: false, error: handleApiError(error).message };
    }
  };

  // Check API status
  const checkApiStatus = async (): Promise<boolean> => {
    try {
      const response = await api.get<ApiStatusResponse>('/auth/status');
      // Handle both direct and wrapped responses
      if ('data' in response && response.data.status) {
        return response.data.status === 'active';
      }
      return (response as ApiStatusResponse).status === 'active';
    } catch (error) {
      console.error('API status check error:', error);
      return false;
    }
  };

  // Initialize auth function
  const initializeAuth = async () => {
    if (!localStorage.getItem('token')) {
        setIsLoading(false);
        return;
    }

    try {
      const tokenResponse = await checkToken();
      
      if (tokenResponse.success && tokenResponse.user) {
        setUser(tokenResponse.user);
        setIsAuthenticated(true);
        setIsAdmin(tokenResponse.user.isAdmin || tokenResponse.user.role === 'admin' || false);
      } else {
        setUser(null);
        setIsAuthenticated(false);
        setIsAdmin(false);
      }
    } catch (error: any) {
      console.error('Auth initialization error:', error);
      setUser(null);
      setIsAuthenticated(false);
      setIsAdmin(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Effect for initial auth check
  useEffect(() => {
    initializeAuth();
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isAdmin,
      isLoading,
      login,
      register,
      logout,
      error,
      clearError
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook for using the auth context
export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Export the context type for use in other files
export type { AuthContextValue };
