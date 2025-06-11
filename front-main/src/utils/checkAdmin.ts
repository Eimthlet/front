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
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No authentication token found in localStorage');
      return { success: false, message: 'No token found' };
    }

    let decodedToken: TokenPayload;
    try {
      decodedToken = JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
      console.error('Failed to parse JWT token:', e);
      return { success: false, message: 'Invalid token format' };
    }

    if (decodedToken.exp && decodedToken.exp < Date.now() / 1000) {
      console.log('Token expired');
      return {
        success: false,
        message: 'Token expired',
        userId: decodedToken.id,
        email: decodedToken.email
      };
    }

    // Even if local token says admin, we must verify with the server.
    // The /auth/check-token endpoint is the source of truth.
    const serverVerification = await api.get('/auth/check-token', {
      withCredentials: true, // Ensure cookies are sent with the request
      headers: {
        'Authorization': `Bearer ${token}` // Also send token in header for compatibility
      }
    });
    
    if (serverVerification && serverVerification.success && serverVerification.user) {
      if (serverVerification.user.isAdmin || (serverVerification.user as any).role === 'admin') {
        console.log('Admin status confirmed by /auth/check-token');
        return {
          success: true,
          message: 'User is an admin',
          userId: serverVerification.user.id,
          email: serverVerification.user.email,
          user: serverVerification.user
        };
      } else {
        console.log('/auth/check-token response indicates user is NOT admin.');
        return {
          success: false,
          message: 'User is not an admin (verified by server)',
          userId: serverVerification.user.id,
          email: serverVerification.user.email,
          user: serverVerification.user
        };
      }
    } else {
      console.log('/auth/check-token call failed or did not return expected data.');
      const errorMessage = serverVerification?.message || 'Server validation failed or returned unexpected data.';
      return {
        success: false,
        message: errorMessage,
        userId: decodedToken.id, // Fallback to decoded token for user info if server call fails
        email: decodedToken.email
      };
    }
  } catch (error: any) {
    console.error('Error in checkAdminStatus:', error);
    let message = 'An unexpected error occurred during admin status check.';
    if (error.response && error.response.data && error.response.data.message) {
      message = error.response.data.message;
    } else if (error.message) {
      message = error.message;
    }
    return { success: false, message };
  }
};

/**
 * Attempts to fix admin token issues by refreshing the token
 */
export const fixAdminToken = async (): Promise<{ success: boolean; message: string }> => {
  const localRefreshToken = localStorage.getItem('refreshToken'); // Assuming refresh token is stored separately

  if (!localRefreshToken) {
    console.error('No refresh token found in localStorage for fixAdminToken');
    // Attempt to use current 'token' as refresh token if 'refreshToken' isn't found, for backward compatibility or specific scenarios
    const currentTokenAsRefreshToken = localStorage.getItem('token');
    if (!currentTokenAsRefreshToken) {
        return { success: false, message: 'No refresh token or current token available to attempt refresh.' };
    }
    // If we proceed with currentTokenAsRefreshToken, log it for clarity
    console.warn('Attempting token refresh using current access token as refresh token. This might not be standard practice.');
    // Fallthrough to use currentTokenAsRefreshToken if localRefreshToken is null
  }

  const tokenToRefresh = localRefreshToken || localStorage.getItem('token');
  if (!tokenToRefresh) {
    // This case should ideally be caught by the above, but as a safeguard:
    return { success: false, message: 'No token available to attempt refresh.' };
  }

  try {
    console.log('Attempting to refresh token...');
    // apiClient.post already unwraps data, so response is the data object
    const responseData = await api.post('/auth/refresh', { refreshToken: tokenToRefresh });

    if (responseData && responseData.token) {
      localStorage.setItem('token', responseData.token);
      // Backend should also return a new refresh token, which should be stored
      if (responseData.refreshToken) {
        localStorage.setItem('refreshToken', responseData.refreshToken);
      }
      console.log('Token refreshed successfully');
      // Optionally, re-check admin status here if critical
      // const adminStatus = await checkAdminStatus();
      // if(adminStatus.success) ...
      return { success: true, message: 'Token refreshed successfully.' };
    } else {
      console.error('Token refresh call succeeded but no new token in response:', responseData);
      return { success: false, message: responseData?.message || 'Failed to refresh token: No new token received.' };
    }
  } catch (error: any) {
    console.error('Error refreshing token:', error);
    let message = 'Failed to refresh token.';
    if (error.response && error.response.data && error.response.data.message) {
      message = error.response.data.message;
    } else if (error.message) {
      message = error.message;
    }
    // If refresh fails (e.g. invalid refresh token), clear stored tokens to force re-login
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    return { success: false, message };
  }
};

const adminUtils = { checkAdminStatus, fixAdminToken };
export default adminUtils;
