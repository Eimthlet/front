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
      
      // authResponse is LoginResponse (type {data: ActualPayload}) | ApiResponse<LoginResponse (type {data: ActualPayload})>
      // This means authResponse can be {data: ActualPayload} or {data: {data: ActualPayload}}

      // Handle cases where authResponse itself might indicate an error (e.g. network error from apiClient)
      if (!authResponse.data && (authResponse as ApiResponse<any>).error) {
        throw new Error(`Login request failed: ${(authResponse as ApiResponse<any>).error}`);
      }
      if (!authResponse.data) {
        // This case implies authResponse is LoginResponse (type {data: ActualPayload}) but .data is missing,
        // or authResponse is ApiResponse but its .data (which would be LoginResponse type) is missing.
        // Or authResponse is ActualPayload directly but without a 'token' (caught later).
        // This check is for a malformed outer structure.
        console.error('Login response is missing the primary data field or has unexpected structure:', authResponse);
        throw new Error('Login response structure is invalid.');
      }

      const firstLevelData = authResponse.data; // Type: ActualPayload | WrapperResponseType
      let actualLoginPayload: any; // Define as specific type e.g. ActualPayload later

      // If firstLevelData has its own 'data' property, it's the WrapperResponseType.
      // And firstLevelData.data should be the ActualPayload.
      if (firstLevelData && 'data' in firstLevelData && firstLevelData.data !== undefined) {
        actualLoginPayload = firstLevelData.data; 
      } else if (firstLevelData && 'token' in firstLevelData) {
        // Otherwise, if firstLevelData has 'token', it's likely the ActualPayload itself.
        actualLoginPayload = firstLevelData;
      } else {
        console.error('Could not extract actual login payload from response structure:', authResponse, firstLevelData);
        throw new Error('Login response data is in an unexpected format or essential data is missing.');
      }
      
      // Now, actualLoginPayload is expected to be the ActualPayload object { success, token, user, error }
      if (!actualLoginPayload || typeof actualLoginPayload.success === 'undefined' || typeof actualLoginPayload.token === 'undefined') {
        console.error('Extracted payload is invalid or missing essential fields:', actualLoginPayload);
        throw new Error('Login failed: Extracted payload is invalid.');
      }

      if (actualLoginPayload.success === false) {
        throw new Error(actualLoginPayload.error || 'Login failed due to an unspecified server error.');
      }

      // This check is technically redundant if the one above passes, but good for clarity.
      if (!actualLoginPayload.token) {
        console.error('Token is missing in the extracted login response payload:', actualLoginPayload);
        throw new Error('Login failed: Authentication token not found in response.');
      }

      const { token, refreshToken, user: userData } = actualLoginPayload;
      
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

      // registerResponse is LoginResponse (type {data: ActualPayload}) | ApiResponse<LoginResponse (type {data: ActualPayload})>

      if (!registerResponse.data && (registerResponse as ApiResponse<any>).error) {
        throw new Error(`Registration request failed: ${(registerResponse as ApiResponse<any>).error}`);
      }
      if (!registerResponse.data) {
        console.error('Register response is missing the primary data field or has unexpected structure:', registerResponse);
        throw new Error('Register response structure is invalid.');
      }

      const firstLevelData = registerResponse.data; // Type: ActualPayload | WrapperResponseType
      let actualRegisterPayload: any; // Define as specific type e.g. ActualPayload later

      // If firstLevelData has its own 'data' property, it's the WrapperResponseType.
      if (firstLevelData && 'data' in firstLevelData && firstLevelData.data !== undefined) {
        actualRegisterPayload = firstLevelData.data;
      } else if (firstLevelData && 'token' in firstLevelData) {
        // Otherwise, if firstLevelData has 'token', it's likely the ActualPayload itself.
        actualRegisterPayload = firstLevelData;
      } else {
        console.error('Could not extract actual register payload from response structure:', registerResponse, firstLevelData);
        throw new Error('Register response data is in an unexpected format or essential data is missing.');
      }

      // Now, actualRegisterPayload is expected to be the ActualPayload object { success, token, user, error }
      if (!actualRegisterPayload || typeof actualRegisterPayload.success === 'undefined' || typeof actualRegisterPayload.token === 'undefined') {
        console.error('Extracted payload is invalid or missing essential fields:', actualRegisterPayload);
        throw new Error('Registration failed: Extracted payload is invalid.');
      }

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
      // response is TokenCheckResponse | ApiResponse<TokenCheckResponse>
      // We need to return TokenCheckResponse
      if ('data' in response && response.data !== undefined) {
        // If response has a 'data' property, assume it's ApiResponse<TokenCheckResponse>
        // and return its 'data' field, which should be TokenCheckResponse.
        return (response as ApiResponse<TokenCheckResponse>).data;
      } else {
        // Otherwise, assume response is already TokenCheckResponse.
        return response as TokenCheckResponse;
      }
    } catch (error: any) {
      console.error('Token check error details:', {
        message: error.message,
        response: error.response?.data, // If using Axios, this might contain server error details
        status: error.response?.status,
        request: error.request,
        fullError: error
      });
      return { data: { error: error.message || 'Failed to check token' } };
    }
  };

  // Check API status
  const checkApiStatus = async (): Promise<boolean> => {
    try {
      const response = await api.get<ApiStatusResponse>(getApiUrl('auth/status'));
      // response is ApiStatusResponse | ApiResponse<ApiStatusResponse>
      // We need to access the 'status' property from the actual ApiStatusResponse object.
      if ('status' in response && response.status !== undefined) {
        // If response has a 'status' property directly, assume it's ApiStatusResponse.
        return (response as ApiStatusResponse).status === 'ok';
      } else if ('data' in response && response.data && 'status' in response.data && response.data.status !== undefined) {
        // If response has a 'data' property, and that 'data' object has a 'status' property,
        // assume response is ApiResponse<ApiStatusResponse>.
        return (response.data as ApiStatusResponse).status === 'ok';
      }
      // Fallback or error handling if the structure is unexpected
      console.warn('Unexpected API status response structure:', response);
      return false;
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
