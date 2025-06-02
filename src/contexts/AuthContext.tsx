import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/apiClient';
import { getApiUrl, verifyApiConfig } from '../utils/apiUrl';
import { handleApiError } from '../utils/apiErrorHandler';

// Verify API config on initialization
verifyApiConfig();

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
  success?: boolean;
  error?: string;
}

interface LoginResponse {
  data: AuthResponse;
  error?: string;
}

interface TokenCheckResponse {
  data: {
    user?: User;
    error?: string;
  };
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
  paths?: string[];
  status?: string;
  data?: any;
  message?: string;
}

interface ApiStatusResponse {
  status: string;
  data?: any;
}

// Create the context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
      // Verify login endpoint exists
      const response = await api.get<AuthEndpointsResponse>(getApiUrl('auth'), {
        timeout: 15000,
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      console.log('Auth endpoint response:', response);
      
      const authResponse = await api.post<LoginResponse>(getApiUrl('auth/login'), { email, password });
      
      if (authResponse.error || authResponse.data.error) {
        throw new Error(authResponse.error || authResponse.data.error);
      }
      
      const { token, refreshToken, user: userData } = authResponse.data;
      
      console.log('Login response:', authResponse);
      
      // Store tokens in localStorage
      if (token) {
        localStorage.setItem('token', token);
      }
      
      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
      }
      
      // Set user state
      if (userData) {
        const user = {
          id: userData.id,
          email,
          isAdmin: userData.isAdmin || userData.role === 'admin' || false,
          role: userData.role
        };
        
        setUser(user);
        setIsAuthenticated(true);
        setIsAdmin(user.isAdmin);
        
        // Navigate based on user role
        if (user.isAdmin) {
          navigate('/admin');
        } else {
          navigate('/quiz');
        }
      } else {
        throw new Error('User data not found in response');
      }
    } catch (error: any) {
      console.error('Login error details:', error);
      const normalizedError = handleApiError(error);
      setError(normalizedError.message);
      throw normalizedError;
    }
  };
  
  // Register function
  const register = async (userData: RegisterData): Promise<void> => {
    setError(null);
    try {
      // Use properly constructed API URL
      const response = await api.get<AuthEndpointsResponse>(getApiUrl('auth'), {
        timeout: 15000,
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      console.log('Auth endpoint response:', response);

      const registerResponse = await api.post<LoginResponse>(
        getApiUrl('auth/register'), 
        userData, 
        {
          timeout: 15000,
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );

      if (registerResponse.error || registerResponse.data.error) {
        throw new Error(registerResponse.error || registerResponse.data.error);
      }

      const { token, refreshToken, user: newUser } = registerResponse.data;

      // Store tokens
      if (token) {
        localStorage.setItem('token', token);
      }

      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
      }

      // Set user state
      if (newUser) {
        const user = {
          id: newUser.id,
          email: userData.email,
          isAdmin: newUser.isAdmin || newUser.role === 'admin' || false,
          role: newUser.role
        };

        setUser(user);
        setIsAuthenticated(true);
        setIsAdmin(user.isAdmin);

        // Navigate based on user role
        if (user.isAdmin) {
          navigate('/admin');
        } else {
          navigate('/quiz');
        }
      } else {
        throw new Error('User data not found in response');
      }
    } catch (error: any) {
      console.error('Registration error details:', error);
      const normalizedError = handleApiError(error);
      setError(normalizedError.message);
      throw normalizedError;
    }
  };

  // Logout function
  const logout = async (): Promise<void> => {
    try {
      // Clear tokens
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      
      // Reset state
      setUser(null);
      setIsAuthenticated(false);
      setIsAdmin(false);
      
      // Navigate to login
      navigate('/login');
    } catch (error: any) {
      console.error('Logout error:', error);
      setError(error.message || 'Failed to logout');
    }
  };

  // Check token function
  const checkToken = async (): Promise<TokenCheckResponse> => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return { data: { error: 'No token found' } };
      }

      const response = await api.get<TokenCheckResponse>(getApiUrl('auth/check-token'));
      return response;
    } catch (error: any) {
      console.error('Token check error:', error);
      return { data: { error: error.message || 'Failed to check token' } };
    }
  };

  // Check API status
  const checkApiStatus = async (): Promise<boolean> => {
    try {
      const response = await api.get<ApiStatusResponse>(getApiUrl('auth/status'));
      return response.status === 'ok';
    } catch (error) {
      console.error('API status check failed:', error);
      return false;
    }
  };

  // Effect for initial auth check
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setIsLoading(true);
        const tokenResponse = await checkToken();
        
        if (tokenResponse.data?.user) {
          setUser(tokenResponse.data.user);
          setIsAuthenticated(true);
          setIsAdmin(tokenResponse.data.user.isAdmin);
        }
      } catch (error: any) {
        console.error('Auth initialization error:', error);
        setError(error.message || 'Failed to initialize authentication');
      } finally {
        setIsLoading(false);
      }
    };

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
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Export the context type for use in other files
export type { AuthContextType };
