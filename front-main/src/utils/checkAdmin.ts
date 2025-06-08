import api from './apiClient';

interface TokenPayload {
  id: number;
  email: string;
  isAdmin?: boolean;
  exp?: number;
  [key: string]: any;
}

interface RefreshTokenResponse {
  token?: string;
  message?: string;
  user?: {
    id: number;
    email: string;
    isAdmin: boolean;
  };
}

interface UserInfoResponse {
  id: number;
  email: string;
  isAdmin: boolean;
  role?: string;
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
        // Verify with the server if the user is still an admin
        try {
          const response = await api.get<UserInfoResponse>('/auth/me');
          console.log('User info from server:', response);
          
          if (!response || !(response.isAdmin || response.role === 'admin')) {
            console.log('Server does not recognize user as admin');
            return { 
              success: false, 
              message: 'User does not have admin privileges on the server',
              userId: response?.id,
              email: response?.email
            };
          }
          console.log('Server confirms admin status');
          return { 
            success: true, 
            message: 'Admin status confirmed',
            user: response
          };
        } catch (error: any) {
          console.error('Error verifying token with server:', error);
          return { 
            success: false, 
            message: 'Error verifying admin status with server',
            userId: decodedToken.id,
            email: decodedToken.email
          };
        }
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
    // Get the current token from localStorage
    const token = localStorage.getItem('token');
    
    if (!token) {
      console.error('No token found in localStorage');
      return { success: false, message: 'No authentication token found' };
    }
    
    // Try to refresh the token
    console.log('Attempting to refresh token...');
    const response = await api.post<RefreshTokenResponse>('/auth/refresh-token', { token });
    
    if (response && 'token' in response && response.token) {
      // Save the new token
      console.log('Token refresh successful');
      localStorage.setItem('token', response.token);
      
      // Verify the new token has admin privileges
      const adminCheck = await checkAdminStatus();
      if (!adminCheck.success) {
        console.error('Refreshed token does not have admin privileges');
        return { 
          success: false, 
          message: adminCheck.message || 'Refreshed token is not an admin token' 
        };
      }
      
      return { 
        success: true, 
        message: 'Token refreshed and verified as admin' 
      };
    }
    
    return { 
      success: false, 
      message: (response as { message?: string })?.message || 'Failed to refresh token' 
    };
  } catch (error) {
    console.error('Error refreshing token:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Failed to refresh token' 
    };
  }
};

const adminUtils = { checkAdminStatus, fixAdminToken };
export default adminUtils;
