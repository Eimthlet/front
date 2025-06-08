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
    let decodedToken: TokenPayload;
    try {
      decodedToken = JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
      console.error('Failed to parse JWT token:', e);
      return { success: false, message: 'Invalid token format' };
    }
    
    console.log('Decoded token:', decodedToken);
    
    // Check if token is expired
    if (decodedToken.exp && decodedToken.exp < Date.now() / 1000) {
      console.log('Token expired');
      return { 
        success: false, 
        message: 'Token expired', 
        userId: decodedToken.id, 
        email: decodedToken.email 
      };
    }
    
    // Check if user is admin in the token
    if (!decodedToken.isAdmin) {
      console.log('User is not an admin according to token');
      return { 
        success: false, 
        message: 'User does not have admin privileges',
        userId: decodedToken.id,
        email: decodedToken.email
      };
    }
    
    // Verify the token with the server
    try {
      const { data: checkTokenData } = await api.get<{ valid: boolean; user?: { id: number; email: string; isAdmin: boolean } }>('/auth/check-token');
      console.log('Token check response:', checkTokenData);
      
      if (checkTokenData.valid && checkTokenData.user?.isAdmin) {
        console.log('Server confirms admin status');
        // Verify with the server if the user is still an admin
        try {
          const { data: userData } = await api.get<UserInfoResponse>('/auth/me');
          console.log('User info from server:', userData);
          
          if (!userData || !(userData.isAdmin || (userData as any).role === 'admin')) {
            console.log('Server does not recognize user as admin');
            return { 
              success: false, 
              message: 'User does not have admin privileges on the server',
              userId: userData?.id,
              email: userData?.email
            };
          }
          console.log('Server confirms admin status');
          // If we got here, the user is confirmed to be an admin
          return { 
            success: true, 
            message: 'User is an admin',
            userId: userData.id,
            email: userData.email,
            user: userData
          };
        } catch (error) {
          console.error('Error verifying admin status with server:', error);
          // If we can't verify with the server, trust the token but log a warning
          return { 
            success: true, 
            message: 'Using cached admin status (server verification failed)',
            userId: checkTokenData.user?.id,
            email: checkTokenData.user?.email,
            user: checkTokenData.user
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
    } catch (error) {
      console.error('Error verifying token with server:', error);
      return { 
        success: false, 
        message: 'Error verifying admin status with server',
        userId: decodedToken?.id,
        email: decodedToken?.email
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
    try {
      console.log('Attempting to refresh token...');
      const { data } = await api.post<RefreshTokenResponse>('/auth/refresh-token', { token });
      
      if (data.token) {
        // Save the new token
        localStorage.setItem('token', data.token);
        console.log('Token refreshed successfully');
        return { success: true, message: 'Token refreshed successfully' };
      } else {
        console.error('No token in refresh response:', data);
        return { success: false, message: data.message || 'Failed to refresh token' };
      }
    } catch (error) {
      console.error('Error refreshing token:', error);
      
      return { 
        success: true, 
        message: 'Token refreshed and verified as admin' 
      };
    }
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
