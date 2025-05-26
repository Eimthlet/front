import React, { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import api from '../utils/api';

// Define User and AuthContextType interfaces locally
interface User {
  id: number;
  username: string;
  role: 'admin' | 'user';
  token: string;
  refreshToken?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (userData: User) => Promise<void>;
  logout: () => void;
  isAdmin: () => boolean;
  refreshToken: () => Promise<void>;
}

// Define types
interface AuthResponse {
  token: string;
  refreshToken: string;
}

// Define JWT payload type
interface JwtPayload {
  id: number;
  email: string;
  isAdmin?: boolean;
  exp?: number;
}

// Create the context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshTokenAndUpdateUser = async () => {
    try {
      const storedRefreshToken = localStorage.getItem('refreshToken');
      if (!storedRefreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await api.post<AuthResponse>('/api/auth/refresh', { refreshToken: storedRefreshToken });
      const { data } = response;

      localStorage.setItem('token', data.token);
      localStorage.setItem('refreshToken', data.refreshToken);

      const decoded = jwtDecode(data.token) as any;
      setUser({
        id: decoded.id,
        username: decoded.email.split('@')[0],
        role: decoded.isAdmin ? 'admin' : 'user',
        token: data.token,
        refreshToken: data.refreshToken
      });
    } catch (error) {
      console.error('Token refresh failed:', error);
      logout();
      throw error;
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const decoded = jwtDecode(token) as any;
          if (decoded.exp && decoded.exp * 1000 > Date.now()) {
            setUser({
              id: decoded.id,
              username: decoded.email.split('@')[0],
              role: decoded.isAdmin ? 'admin' : 'user',
              token
            });
          } else {
            // Token expired, try to refresh
            await refreshTokenAndUpdateUser();
          }
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);
        // Clear any invalid tokens
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (userData: User): Promise<void> => {
    try {
      // Validate token format
      const decoded = jwtDecode(userData.token) as any;
      if (!decoded || !decoded.id || !decoded.email) {
        throw new Error('Invalid token format');
      }

      console.log('AuthContext Login:', {
        userId: userData.id,
        username: userData.username,
        role: userData.role,
        tokenLength: userData.token.length,
        tokenFirstChars: userData.token.substring(0, 10)
      });

      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('token', userData.token);
      localStorage.setItem('refreshToken', userData.refreshToken);
      
      // Additional verification logging
      const storedUser = localStorage.getItem('user');
      const storedToken = localStorage.getItem('token');
      console.log('Storage Verification:', {
        userStored: !!storedUser,
        tokenStored: !!storedToken,
        storedTokenLength: storedToken?.length
      });
    } catch (error) {
      console.error('Token validation failed:', error);
      throw error;
    }
  };

  const logout = () => {
    console.log('AuthContext Logout:', {
      currentUser: user?.username
    });

    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    
    // Verification logging
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');
    console.log('Logout Verification:', {
      userRemoved: !storedUser,
      tokenRemoved: !storedToken
    });
  };

  const isAdmin = () => {
    return user?.role === 'admin';
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isLoading, 
      login, 
      logout, 
      isAdmin,
      refreshToken: refreshTokenAndUpdateUser 
    }}>
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
