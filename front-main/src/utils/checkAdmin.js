// Simple utility to check admin status and fix token issues
import apiClient from './apiClient';

export const checkAdminStatus = async () => {
  try {
    // Get the current token from localStorage
    const token = localStorage.getItem('token');
    
    if (!token) {
      console.error('No authentication token found in localStorage');
      return { success: false, message: 'No token found' };
    }
    
    // Decode the token to check if isAdmin is set
    const parseJwt = (token) => {
      try {
        return JSON.parse(atob(token.split('.')[1]));
      } catch (e) {
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
      const response = await api.get('/auth/check-token');
      console.log('Token check response:', response);
      
      if (response.data && response.data.valid && response.data.user && response.data.user.isAdmin) {
        console.log('Server confirms admin status');
        return { 
          success: true, 
          message: 'Admin status confirmed', 
          user: response.data.user 
        };
      } else {
        console.error('Server does not confirm admin status');
        return { 
          success: false, 
          message: 'Server does not recognize admin status',
          serverResponse: response.data
        };
      }
    } catch (error) {
      console.error('Error checking token with server:', error);
      return { 
        success: false, 
        message: 'Error verifying token with server', 
        error 
      };
    }
  } catch (error) {
    console.error('Error in checkAdminStatus:', error);
    return { success: false, message: 'Error checking admin status', error };
  }
};

// Function to fix admin token issues
export const fixAdminToken = async () => {
  try {
    console.error('Admin token needs to be refreshed. Please log in again with your admin credentials.');
    return {
      success: false,
      message: 'Please log in again with your admin credentials',
      error: 'Token expired or invalid'
    };
  } catch (error) {
    console.error('Error fixing admin token:', error);
    return {
      success: false,
      message: 'Error during admin authentication',
      error
    };
  }
};

export default {
  checkAdminStatus,
  fixAdminToken
};
