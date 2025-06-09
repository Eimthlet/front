import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/apiClient';
import { handleApiError, NormalizedApiError } from '../utils/apiErrorHandler';

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

interface TokenCheckResponse {
  isAuthenticated: boolean; // Changed from success
  user?: User;
  error?: string;
  code?: string; // Added to match backend error response
}

// Combined type for the context value, including state and action dispatchers
interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<{ tx_ref: string; public_key: string; amount: number; email: string; phone: string; } | null>;
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
      console.log('Attempting to log in with email:', email);
      
      // Basic validation
      if (!email || !password) {
        throw new Error('Email and password are required');
      }
      
      const response = await api.post('/auth/login', { email, password })
        .catch(error => {
          console.error('Login API call failed:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status,
            config: {
              url: error.config?.url,
              method: error.config?.method,
              data: error.config?.data
            }
          });
          throw error;
        });
      
      // Debug log the raw response
      console.log('Raw login response:', response);
      
      // The response data might be in response.data or directly in response
      let responseData = response?.data || response;
      
      // If responseData is a string, try to parse it as JSON
      if (typeof responseData === 'string') {
        try {
          responseData = JSON.parse(responseData);
        } catch (e) {
          console.error('Failed to parse response data:', e);
          throw new Error('Invalid response format from server');
        }
      }
      
      console.log('Login response data:', responseData);
      
      // Check if the response contains the expected data structure
      if (!responseData || typeof responseData !== 'object') {
        console.error('Invalid response format:', responseData);
        throw new Error('Invalid response format from server');
      }
      
      // The server returns the tokens and user data at the root level
      const { token, refreshToken, user } = responseData;
      
      if (!token || !user) {
        console.error('Missing required fields in response:', { 
          hasToken: !!token, 
          hasUser: !!user,
          responseDataKeys: Object.keys(responseData)
        });
        throw new Error('Missing required authentication data');
      }
      
      console.log('Setting tokens and user data:', { token, refreshToken, user });
      
      // Store tokens
      localStorage.setItem('token', token);
      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
      }
      
      // Update state
      setUser(user);
      setIsAuthenticated(true);
      setIsAdmin(user.isAdmin);
      
      console.log('Login successful, navigating to:', user.isAdmin ? '/admin' : '/quiz');
      navigate(user.isAdmin ? '/admin' : '/quiz');
    } catch (error: any) {
      const normalizedError = handleApiError(error);
      setError(normalizedError.message);
      throw normalizedError;
    }
  };
  
  // Register function
  // Register function - initiates payment flow
  const register = async (userData: RegisterData): Promise<{ tx_ref: string; public_key: string; amount: number; email: string; phone: string; } | null> => {
    setError(null);
    try {
      console.log('Attempting to register and initiate payment with data:', userData);
      const response = await api.post('/auth/register', userData);
      const responseData = response?.data;

      console.log('Raw registration response:', responseData);

      if (!responseData || !responseData.success || !responseData.tx_ref || !responseData.public_key) {
        const errorMsg = responseData?.error || 'Registration failed: Invalid response from server. Missing tx_ref or public_key.';
        console.error('Registration error:', errorMsg, 'Response Data:', responseData);
        setError(errorMsg);
        throw new Error(errorMsg);
      }

      // Return payment details instead of setting auth state
      console.log('Registration initiated, proceeding to payment with:', responseData);
      return {
        tx_ref: responseData.tx_ref,
        public_key: responseData.public_key,
        amount: responseData.amount,
        email: responseData.email,
        phone: responseData.phone
      };

    } catch (error: any) {
      // Log the detailed error object if available
      console.error('Full registration error object:', error);
      const normalizedError = handleApiError(error);
      console.error('Normalized registration error:', normalizedError.message);
      setError(normalizedError.message);
      // Ensure the function calling register can catch this to prevent unhandled promise rejections
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
      const response = await api.get('/auth/check-token');
      // Backend returns isAuthenticated directly, not nested under 'data' for this specific helper
      // and also doesn't use a 'success' field for this endpoint.
      return response?.data || { isAuthenticated: false, error: 'No response data from /auth/check-token' };
    } catch (error: any) {
      console.error('Token check error details:', error);
      const apiError: NormalizedApiError = handleApiError(error);
      return { 
        isAuthenticated: false, 
        error: apiError.message, 
        code: apiError.code // Now safe to access directly
      };
    }
  };

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const response = await checkToken();
          if (response.isAuthenticated && response.user) {
            setUser(response.user);
            setIsAuthenticated(true);
            setIsAdmin(response.user.isAdmin || false);
          } else {
            localStorage.removeItem('token');
            setUser(null);
            setIsAuthenticated(false);
            setIsAdmin(false);
          }
        }
        setIsLoading(false);
      } catch (error) {
        console.error('Auth initialization error:', error);
        setUser(null);
        setIsAuthenticated(false);
        setIsAdmin(false);
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
