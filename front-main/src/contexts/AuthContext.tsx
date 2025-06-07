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
  exp?: number;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  error: string | null;
}

// Represents the actual login response data structure
interface LoginData {
  success: boolean;
  token: string;
  refreshToken: string;
  user: User;
  error?: string;
}

// The login response comes directly, not wrapped
type LoginResponse = LoginData;

interface TokenCheckResponse {
  success: boolean;
  error?: string;
  user: User;
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
  status: string;
  endpoints: string[];
}

interface ApiStatusResponse {
  status: string;
}

// Combined type for the context value, including state and action dispatchers
interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

interface RegisterData {
  email: string;
  password: string;
  username?: string;
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
      // Verify login endpoint exists
      const response = await api.get<AuthEndpointsResponse>('/auth', {
        timeout: 15000,
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      console.log('Auth endpoint response:', response);
      
      // First check if the auth endpoint is active
      const authEndpointResponse = response as AuthEndpointsResponse;
      if (authEndpointResponse.status !== 'active') {
        console.error('Auth endpoint not active. Response:', response);
        throw new Error('Authentication service is not available');
      }

      // Make the login request
      const loginResponse = await api.post<LoginResponse>('/auth/login', { email, password });
      
      console.log('Login response:', loginResponse);

      // Check for errors in a safe way
      const loginData = loginResponse as LoginData;
      if (!loginData || !loginData.success) {
        console.error('Invalid login response:', loginResponse);
        throw new Error(loginData?.error || 'Invalid response from authentication service');
      }

      if (!loginData.token || !loginData.user) {
        throw new Error('Invalid login response: missing token or user data');
      }
      
      // Store tokens in localStorage
      localStorage.setItem('token', loginData.token);
      if (loginData.refreshToken) {
        localStorage.setItem('refreshToken', loginData.refreshToken);
      }
      
      // Set user state
      const user = {
        id: loginData.user.id,
        email,
        isAdmin: loginData.user.isAdmin || loginData.user.role === 'admin' || false,
        role: loginData.user.role
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
    } catch (error: any) {
      console.error('Login error:', error);
      setError(error.message || 'Failed to log in');
      throw error;
    }
  };
  
  // Register function
  const register = async (userData: RegisterData): Promise<void> => {
    setError(null);
    try {
      // Use properly constructed API URL
      const response = await api.get<AuthEndpointsResponse>('/auth', {
        timeout: 15000,
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      console.log('Auth endpoint response:', response);

      // Type the initial API response as 'any' for flexibility
      const registerResponse: any = await api.post<any>(
        '/auth/register', 
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

      let actualRegisterPayload: LoginData | undefined = undefined;

      // Check for a specific API client error structure first.
      if (registerResponse && typeof registerResponse.error === 'string' &&
          registerResponse.success === undefined && registerResponse.token === undefined && registerResponse.data === undefined) {
          throw new Error(`Registration request failed due to API client error: ${registerResponse.error}`);
      }

      // Scenario 1: registerResponse is the LoginData itself
      if (registerResponse && typeof registerResponse.token === 'string' && typeof registerResponse.success === 'boolean') {
          actualRegisterPayload = registerResponse as LoginData;
      }
      // Scenario 2: registerResponse is { data: LoginData }
      else if (registerResponse && registerResponse.data &&
               typeof registerResponse.data.token === 'string' && typeof registerResponse.data.success === 'boolean') {
          actualRegisterPayload = registerResponse.data as LoginData;
      }
      // Scenario 3: registerResponse is { data: { data: LoginData } } (doubly wrapped)
      else if (registerResponse && registerResponse.data && registerResponse.data.data &&
               typeof registerResponse.data.data.token === 'string' && typeof registerResponse.data.data.success === 'boolean') {
          actualRegisterPayload = registerResponse.data.data as LoginData;
      }

      // If no structure matched and payload wasn't identified
      if (!actualRegisterPayload) {
        console.error('Could not extract actual register payload from response structure:', registerResponse);
        throw new Error('Register response data is in an unexpected format or essential data is missing.');
      }

      // At this point, actualRegisterPayload is guaranteed to be of type LoginData.
      // Proceed with checks on the identified payload.
      if (actualRegisterPayload.success === false) {
        throw new Error(actualRegisterPayload.error || 'Registration failed due to an unspecified server error.');
      }

      if (!actualRegisterPayload.token) {
        console.error('Token is missing in the extracted register response payload:', actualRegisterPayload);
        throw new Error('Registration failed: Authentication token not found in response.');
      }

      const { token, refreshToken, user: newUser } = actualRegisterPayload;

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
      console.error('Registration error:', error);
      setError(error.message || 'Failed to register');
      throw error;
    }
  };

  // Logout function
  const logout = async (): Promise<void> => {
    try {
      // Call logout endpoint
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
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
      
      // Handle the response format from the server
      if ('data' in response) {
        // Response is wrapped in ApiResponse
        const apiResponse = response as ApiResponse<TokenCheckResponse>;
        return apiResponse.data;
      }
      
      // Response is direct
      return response;
    } catch (error: any) {
      console.error('Token check error details:', error);
      throw error;
    }
  };

  // Check API status function
  const checkApiStatus = async (): Promise<boolean> => {
    try {
      const response = await api.get<ApiStatusResponse>('/auth/status');
      
      // Handle the response format from the server
      if ('data' in response) {
        // Response is wrapped in ApiResponse
        const apiResponse = response as ApiResponse<ApiStatusResponse>;
        return apiResponse.data.status === 'active';
      }
      
      // Response is direct
      return response.status === 'active';
    } catch (error) {
      console.error('API status check error:', error);
      return false;
    }
  };

  // Effect for initial auth check
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setIsLoading(true);
        const tokenResponse = await checkToken();
        
        if (tokenResponse.user) {
          setUser(tokenResponse.user);
          setIsAuthenticated(true);
          setIsAdmin(tokenResponse.user.isAdmin);
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
export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Export the context type for use in other files
export type { AuthContextValue };
