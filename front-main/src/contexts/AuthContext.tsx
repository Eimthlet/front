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

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
}

// Represents the structure if the API client wraps the response (e.g., Axios default)
interface WrappedLoginResponse {
  data: ActualLoginPayload; // The actual payload is nested
  error?: string; 
}

// Represents the actual payload structure from the backend API for a login attempt
// This is the primary type we expect after unwrapping/identifying the core response.
interface ActualLoginPayload {
  success: boolean; // 'success' is mandatory for a valid payload
  token: string;    // 'token' is mandatory for a successful login payload
  refreshToken?: string;
  user: User;       // 'user' object is mandatory for a successful login payload
  error?: string;   // 'error' might be present if success is false
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
      
      // Type the initial API response as 'any' to allow for flexible structural checks without TypeScript errors.
      // LoginResponse should be the type of the actual payload (e.g., { success: boolean; token: string; ... })
      const authResponse: any = await api.post(getApiUrl('auth/login'), { email, password });
      
      let actualLoginPayload: ActualLoginPayload | undefined = undefined; 

      // Check for a specific API client error structure first.
      // This example assumes an error object like { error: string } without typical payload fields.
      if (authResponse && typeof authResponse.error === 'string' &&
          authResponse.success === undefined && authResponse.token === undefined && authResponse.data === undefined) {
          throw new Error(`Login request failed due to API client error: ${authResponse.error}`);
      }

      // Scenario 1: authResponse is the LoginResponse payload itself (most likely based on logs)
      if (authResponse && typeof authResponse.token === 'string' && typeof authResponse.success === 'boolean') {
          actualLoginPayload = authResponse as ActualLoginPayload;
      }
      // Scenario 2: authResponse is { data: LoginResponse } (e.g., standard Axios wrapper)
      else if (authResponse && authResponse.data &&
               typeof authResponse.data.token === 'string' && typeof authResponse.data.success === 'boolean') {
          actualLoginPayload = authResponse.data as ActualLoginPayload;
      }
      // Scenario 3: authResponse is { data: { data: LoginResponse } } (doubly wrapped)
      else if (authResponse && authResponse.data && authResponse.data.data &&
               typeof authResponse.data.data.token === 'string' && typeof authResponse.data.data.success === 'boolean') {
          actualLoginPayload = authResponse.data.data as ActualLoginPayload;
      }

      // If no structure matched and payload wasn't identified
      if (!actualLoginPayload) {
        // Use the original authResponse in the error log as it holds the raw structure received.
        console.error('Login response is in an unrecognized structure or essential data is missing:', authResponse);
        throw new Error('Login response structure is invalid. Could not identify payload.');
      }

      // Now, actualLoginPayload is typed as ActualLoginPayload | undefined.

      // Check if a valid payload was extracted. 
      // If actualLoginPayload is undefined here, it means none of the scenarios matched.
      if (!actualLoginPayload) {
        // This error was already thrown by the scenario checks, but as a safeguard:
        console.error('Critical: actualLoginPayload is undefined after structural checks. Original response:', authResponse);
        throw new Error('Login failed: Payload could not be identified or is fundamentally malformed.');
      }

      // At this point, actualLoginPayload is guaranteed to be of type ActualLoginPayload.
      // TypeScript should now correctly infer types for .success, .token, .user etc.

      if (actualLoginPayload.success === false) {
        // If success is false, there should be an error message from the server.
        throw new Error(actualLoginPayload.error || 'Login failed due to an unspecified server error.');
      }

      // If success is true, token and user must be present as per ActualLoginPayload definition.
      // The check for token presence is still good practice before using it.
      if (!actualLoginPayload.token || !actualLoginPayload.user) {
        console.error('Token or user data is missing in the successfully extracted login response payload:', actualLoginPayload);
        throw new Error('Login failed: Essential data (token/user) not found in an otherwise successful response.');
      }

      // Destructure from the correctly typed actualLoginPayload
      const { token, refreshToken, user: userDataFromPayload } = actualLoginPayload;
      
      console.log('Login successful. Tokens and user data processed.');
      
      // Store tokens in localStorage
      localStorage.setItem('token', token);
      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
      }
      
      // Set user state using userDataFromPayload
      // Ensure the user object created for context matches the User interface
      const authenticatedUser: User = {
        id: userDataFromPayload.id,
        email: userDataFromPayload.email, // Use email from payload
        isAdmin: userDataFromPayload.isAdmin || userDataFromPayload.role === 'admin' || false,
        role: userDataFromPayload.role
      };
      
      setUser(authenticatedUser);
      setIsAuthenticated(true);
      setIsAdmin(authenticatedUser.isAdmin);
      
      // Navigate based on user role
      if (authenticatedUser.isAdmin) {
        navigate('/admin');
      } else {
        navigate('/quiz');
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

      // Type the initial API response as 'any' for flexibility
      const registerResponse: any = await api.post<any>(
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

      let actualRegisterPayload: ActualLoginPayload | undefined = undefined;

      // Check for a specific API client error structure first.
      if (registerResponse && typeof registerResponse.error === 'string' &&
          registerResponse.success === undefined && registerResponse.token === undefined && registerResponse.data === undefined) {
          throw new Error(`Registration request failed due to API client error: ${registerResponse.error}`);
      }

      // Scenario 1: registerResponse is the ActualLoginPayload itself
      if (registerResponse && typeof registerResponse.token === 'string' && typeof registerResponse.success === 'boolean') {
          actualRegisterPayload = registerResponse as ActualLoginPayload;
      }
      // Scenario 2: registerResponse is { data: ActualLoginPayload }
      else if (registerResponse && registerResponse.data &&
               typeof registerResponse.data.token === 'string' && typeof registerResponse.data.success === 'boolean') {
          actualRegisterPayload = registerResponse.data as ActualLoginPayload;
      }
      // Scenario 3: registerResponse is { data: { data: ActualLoginPayload } } (doubly wrapped)
      else if (registerResponse && registerResponse.data && registerResponse.data.data &&
               typeof registerResponse.data.data.token === 'string' && typeof registerResponse.data.data.success === 'boolean') {
          actualRegisterPayload = registerResponse.data.data as ActualLoginPayload;
      }

      // If no structure matched and payload wasn't identified
      if (!actualRegisterPayload) {
        console.error('Could not extract actual register payload from response structure:', registerResponse);
        throw new Error('Register response data is in an unexpected format or essential data is missing.');
      }

      // At this point, actualRegisterPayload is guaranteed to be of type ActualLoginPayload.
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
      loading: isLoading, // Map isLoading state to loading context value
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
