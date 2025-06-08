import api from './apiClient';

interface TokenPayload {
  id: number;
  email: string;
  isAdmin?: boolean;
  exp?: number;
  [key: string]: any;
}

interface AdminStatusResponse {
  success: boolean;
  message: string;
  userId?: number;
  email?: string;
  user?: {
    id: number;
    email: string;
    isAdmin: boolean;
  };
}

/**
 * Checks if the current user is an admin by verifying the token and server status
 */
export const checkAdminStatus = async (): Promise<AdminStatusResponse> => {
  try {
    // Get the current token from localStorage
    const token = localStorage.getItem('token');
    
    if (!token) {
      console.error('No authentication token found in localStorage');
      return { success: false, message: 'No token found' };
    }
    
    // Decode the token to check if isAdmin is set
    const parseJwt = (token: string): TokenPayload | null => {
      try {
        return JSON.parse(atob(token.split('.')[1]));
      } catch (e) {
        console.error('Failed to parse JWT token:', e);
        return null;
      }
    };
    
    const decodedToken = parseJwt(token);
    console.log('Decoded token:', decodedToken);
    
    if (!decodedToken) {
      console.error('Failed to decode token');
      return { success: false, message: 'Invalid token format' };
    }
    
    // Check if isAdmin is set in the token
    if (!decodedToken.isAdmin) {
      console.error('User is not an admin according to the token');
      return { 
        success: false, 
        message: 'Not an admin user', 
        userId: decodedToken.id,
        email: decodedToken.email 
      };
    }
    
    // Verify the token with the server
    try {
      const response = await api.get<{ valid: boolean; user?: { id: number; email: string; isAdmin: boolean } }>('/auth/check-token');
      console.log('Token check response:', response);
      
      if (response.valid && response.user?.isAdmin) {
        console.log('Server confirms admin status');
        return { 
          success: true, 
          message: 'Admin status confirmed',
          user: response.user
        };
      } else {
        console.error('Server does not confirm admin status');
        return { 
          success: false, 
          message: 'Server does not confirm admin status',
          userId: decodedToken.id,
          email: decodedToken.email
        };
      }
    } catch (error: any) {
      console.error('Error verifying token with server:', error);
      return { 
        success: false, 
        message: 'Error verifying admin status with server',
        userId: decodedToken.id,
        email: decodedToken.email
      };
    }
  } catch (error) {
    console.error('Error checking admin status:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

/**
 * Attempts to fix admin token issues by refreshing the token
 */
export const fixAdminToken = async (): Promise<{ success: boolean; message: string }> => {
  try {
    // Try to refresh the token
    interface RefreshTokenResponse {
      token?: string;
      error?: string;
    }
  
    const response = await api.post<RefreshTokenResponse>('/auth/refresh-token');
  
    if (response && 'token' in response && response.token) {
      // Store the new token
      localStorage.setItem('token', response.token);
      console.log('Token refreshed successfully');
      return { success: true, message: 'Token refreshed successfully' };
    } else {
      return { success: false, message: 'Failed to refresh token' };
    }
  } catch (error) {
    console.error('Error refreshing token:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Failed to refresh token'
    };
  }
};

export default { checkAdminStatus, fixAdminToken };
