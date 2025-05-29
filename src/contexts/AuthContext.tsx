import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../utils/apiClient';
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
      const response = await apiClient.get<AuthEndpointsResponse>(getApiUrl('auth'), {
        timeout: 15000,
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      // If we get a 200 response, consider the API ready
      // Only check status if it's explicitly set to something other than 'active'
      if (response.data?.status && response.data.status !== 'active') {
        throw new Error('Authentication service currently unavailable');
      }

      // If paths is undefined, we'll assume the login endpoint is available
      // since we're getting a successful response from the auth endpoint
      const hasLoginEndpoint = !response.data.paths || response.data.paths.includes('/login');
      if (!hasLoginEndpoint) {
        throw new Error('Login service currently unavailable');
      }
      
      const authResponse = await apiClient.post<ApiResponse<AuthResponse>>(getApiUrl('auth/login'), { email, password });
      
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
      // Use properly constructed API URL
      const response = await apiClient.get<AuthEndpointsResponse>(getApiUrl('auth'), {
        timeout: 15000,
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      // If we get a 200 response, consider the API ready
      // Only check status if it's explicitly set to something other than 'active'
      if (response.data?.status && response.data.status !== 'active') {
        throw new Error('Authentication service currently unavailable');
      }
      
      // If paths is undefined, we'll assume the register endpoint is available
      // since we're getting a successful response from the auth endpoint
      const hasRegisterEndpoint = !response.data.paths || response.data.paths.includes('register');
      if (!hasRegisterEndpoint) {
        throw new Error('Registration service is currently unavailable');
      }
      
      const registerResponse = await apiClient.post<ApiResponse<AuthResponse>>(
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
      
      if (registerResponse.data.error) {
        throw new Error(registerResponse.data.error);
      }
      
      const { token, refreshToken, user: registeredUser } = registerResponse.data.data;
      
      if (registeredUser) {
        localStorage.setItem('token', token);
        if (refreshToken) {
          localStorage.setItem('refreshToken', refreshToken);
        }
        setUser(registeredUser);
        setIsAuthenticated(true);
        setIsAdmin(registeredUser.isAdmin);
        navigate('/');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      const normalizedError = handleApiError(error);
      setError(normalizedError.message);
      throw normalizedError;
    }
  };
  
  // Logout function
  const logout = async (): Promise<void> => {
    try {
      await apiClient.post(getApiUrl('auth/logout'));
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
        const checkApiStatusResponse = await checkApiStatus();
        if (!checkApiStatusResponse) {
          throw new Error('API not ready');
        }
        
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
      const response = await apiClient.get<AuthEndpointsResponse>(getApiUrl('auth'), {
        timeout: 15000,
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      // If we get a 200 response, consider the API ready
      // Only check status if it's explicitly set to something other than 'active'
      if (response.data?.status && response.data.status !== 'active') {
        return { error: 'Authentication service unavailable' };
      }

      // If paths is undefined, we'll assume the check-token endpoint is available
      // since we're getting a successful response from the auth endpoint
      const hasCheckTokenEndpoint = !response.data.paths || response.data.paths.includes('/check-token');
      if (!hasCheckTokenEndpoint) {
        return { error: 'Authentication service unavailable' };
      }
      
      const tokenResponse = await apiClient.get<TokenCheckResponse>(getApiUrl('auth/check-token'));
      return tokenResponse.data;
    } catch (err) {
      if (err.response?.status === 404) {
        return { error: 'Authentication service unavailable' };
      }
      const normalizedError = handleApiError(err);
      return { error: normalizedError.message };
    }
  };

  const checkApiStatus = async (): Promise<boolean> => {
    try {
      const response = await apiClient.get<ApiStatusResponse>('/auth');
      if (!response.data?.status || response.data.status !== 'active') {
        console.error('API status check failed:', response.data);
        throw new Error('API not ready');
      }
      return true;
    } catch (error) {
      const normalizedError = handleApiError(error);
      console.error('API status check failed:', normalizedError);
      throw normalizedError;
    }
  };

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

// Export the context type for use in other files
export type { AuthContextType };
