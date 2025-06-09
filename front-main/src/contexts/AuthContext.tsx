import { createContext, useContext, useState, useEffect, useCallback } from 'react';
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

interface TokenCheckResponse {
  success: boolean;
  user?: User;
  error?: string;
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
      const response = await api.post('/auth/login', { email, password });
      const responseData = response?.data || {};

      if (!responseData.success || !responseData.token || !responseData.user) {
        throw new Error(responseData.error || 'Login failed: Invalid response from server.');
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
      const response = await api.post('/auth/register', userData);
      const responseData = response?.data || {};

      if (!responseData.success || !responseData.token || !responseData.user) {
        throw new Error(responseData.error || 'Registration failed: Invalid response from server.');
      }

      localStorage.setItem('token', responseData.token);
      if (responseData.refreshToken) {
        localStorage.setItem('refreshToken', responseData.refreshToken);
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
      const response = await api.get('/auth/check-token');
      return response?.data || { success: false, error: 'No response data' };
    } catch (error: any) {
      console.error('Token check error details:', error);
      return { success: false, error: handleApiError(error).message };
    }
  };

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const response = await checkToken();
          if (response.success && response.user) {
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
