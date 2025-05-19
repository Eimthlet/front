import React, { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import { refreshToken as refreshTokenApi } from '../api';

// Define the shape of the user
interface User {
  id: number;
  username: string;
  role: 'admin' | 'user';
  token: string;
}

// Define the context type
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (user: User) => void;
  logout: () => void;
  isAdmin: () => boolean;
  refreshToken: () => Promise<void>;
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

      const response = await refreshTokenApi(storedRefreshToken);
      const { token, refreshToken: newRefreshToken } = response;

      localStorage.setItem('token', token);
      localStorage.setItem('refreshToken', newRefreshToken);

      const decoded = jwtDecode(token) as any;
      setUser({
        id: decoded.id,
        username: decoded.email.split('@')[0],
        role: decoded.isAdmin ? 'admin' : 'user',
        token
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

  const login = (userData: User) => {
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
    
    // Additional verification logging
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');
    console.log('Storage Verification:', {
      userStored: !!storedUser,
      tokenStored: !!storedToken,
      storedTokenLength: storedToken?.length
    });
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
