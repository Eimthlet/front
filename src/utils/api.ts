import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { API_CONFIG, AUTH_CONFIG } from '../config';

// Always use the production URL
const API_BASE_URL = 'https://car-quizz.onrender.com';

// Define types for API responses
interface AuthResponse {
  token: string;
  refreshToken: string;
  user: {
    id: number;
    username: string;
    role: string;
  };
}

interface ApiResponse<T> {
  data: T;
  message?: string;
  error?: string;
}

interface FailedRequest {
  resolve: (token: string) => void;
  reject: (error: Error) => void;
}

interface RefreshTokenResponse {
  token: string;
  refreshToken: string;
}

// Create a custom Axios instance with retry logic
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // Increased timeout to 30 seconds
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true // Always include credentials for cross-origin requests
});

// Track if we're already trying to refresh the token
let isRefreshing = false;
let failedQueue: FailedRequest[] = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
};

// Add a request interceptor to include the token
api.interceptors.request.use(
  (config) => {
    // Always include credentials for cross-origin requests
    config.withCredentials = true;
    
    // Get token from localStorage or cookie will be used automatically
    const token = localStorage.getItem('token');
    if (token) {
      // Add Authorization header for all requests
      config.headers.Authorization = `Bearer ${token}`;
      console.log('Added Authorization header to request:', config.url);
    } else {
      console.log('No token found in localStorage for request:', config.url);
    }
    
    console.log('Request config:', {
      url: config.url,
      method: config.method,
      withCredentials: config.withCredentials,
      hasAuthHeader: !!config.headers.Authorization,
      headers: config.headers
    });
    
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Helper function to retry failed requests
const retryRequest = async (config: any, retries = 3, delay = 1000) => {
  try {
    return await api(config);
  } catch (error: any) {
    if (retries === 0 || error.response?.status === 401) {
      throw error;
    }
    
    // Wait for the specified delay
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Retry the request
    return retryRequest(config, retries - 1, delay * 2);
  }
};

// Add a response interceptor to handle token refresh and errors
api.interceptors.response.use(
  (response) => {
    console.log('Response received:', {
      url: response.config.url,
      status: response.status,
      data: response.data,
      headers: response.headers
    });
    
    // Transform the response to ensure consistent data structure
    if (response.data && typeof response.data === 'object') {
      // If the response already has a data property, return as is
      return response;
    }
    
    // Otherwise, wrap the response data in a data property
    return {
      ...response,
      data: {
        data: response.data
      }
    };
  },
  async (error) => {
    console.error('API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      headers: error.config?.headers
    });

    const originalRequest = error.config;
    
    // If there's no response or config, it's a network error
    if (!error.response) {
      console.error('Network error - no response received:', error.message);
      return Promise.reject({
        message: 'Network Error',
        isNetworkError: true,
        originalError: error
      });
    }

    // Handle timeout errors
    if (error.code === 'ECONNABORTED') {
      console.error('Request timeout:', {
        url: originalRequest.url,
        method: originalRequest.method
      });

      // Retry the request if it's not a retry attempt
      if (!originalRequest._retry) {
        originalRequest._retry = true;
        try {
          return await retryRequest(originalRequest);
        } catch (retryError) {
          return Promise.reject({
            message: 'Request timed out after multiple attempts. Please check your internet connection and try again.',
            originalError: retryError
          });
        }
      }

      return Promise.reject({
        message: 'Request timed out. Please check your internet connection and try again.',
        originalError: error
      });
    }

    // Handle network errors
    if (!error.response) {
      console.error('Network error:', error);
      
      // Retry the request if it's not a retry attempt
      if (!originalRequest._retry) {
        originalRequest._retry = true;
        try {
          return await retryRequest(originalRequest);
        } catch (retryError) {
          return Promise.reject({
            message: 'Network error after multiple attempts. Please check your internet connection and try again.',
            originalError: retryError
          });
        }
      }

      return Promise.reject({
        message: 'Network error. Please check your internet connection and try again.',
        originalError: error
      });
    }

    if (error.response.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers['Authorization'] = `Bearer ${token}`;
          return api(originalRequest);
        }).catch(err => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Get the refresh token from localStorage if available
        const storedRefreshToken = localStorage.getItem('refreshToken');
        
        // Use the refresh endpoint with the token in the request body
        const response = await axios.post<RefreshTokenResponse>(
          `${API_BASE_URL}/api/auth/refresh`, 
          { refreshToken: storedRefreshToken }, 
          { withCredentials: true }
        );
        
        if (response.data && response.data.token) {
          // Store the new tokens in localStorage
          localStorage.setItem('token', response.data.token);
          localStorage.setItem('refreshToken', response.data.refreshToken);
          
          // Add the token to the original request
          originalRequest.headers['Authorization'] = `Bearer ${response.data.token}`;
          
          // Process the queue with the new token
          processQueue(null, response.data.token);
          return api(originalRequest);
        }
        
        throw new Error('Invalid refresh token response');
      } catch (refreshError) {
        processQueue(refreshError as Error, null);
        // No need to remove tokens from localStorage as we're using cookies
        // The server will handle invalidating the cookies
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Handle other errors
    let errorMessage = error.response?.data?.error || 
                      error.response?.data?.message || 
                      error.message || 
                      'An unexpected error occurred';
    
    // Log the full error response for debugging
    console.log('Full error response:', error.response?.data);
    
    // Create a more user-friendly error message for logging purposes
    // Special handling for 403 errors
    if (error.response?.status === 403) {
      // Use the exact error message from the server if available
      const errorMessage = error.response.data?.error || 'You do not have permission to access this resource. Please check your credentials.';
      return Promise.reject({
        message: errorMessage,
        originalError: error,
        status: 403,
        url: error.config.url,
        method: error.config.method,
        response: error.response
      });
    }
    
    // Create a more user-friendly error message for logging purposes
    let userFriendlyMessage = errorMessage;
    
    // For timeout errors
    if (error.code === 'ECONNABORTED' || errorMessage.includes('timeout')) {
      userFriendlyMessage = 'Request timed out after multiple attempts. Please check your internet connection and try again.';
    }
    // For network errors
    else if (errorMessage === 'Network Error') {
      userFriendlyMessage = 'Unable to connect to the server. Please check your internet connection and try again.';
    }
    // For server errors (500 range)
    else if (error.response?.status >= 500) {
      userFriendlyMessage = 'The server encountered an error. Please try again later.';
    }

    return Promise.reject({
      message: userFriendlyMessage, // Use the user-friendly message
      originalError: error, // Keep the original error for debugging
      status: error.response?.status,
      url: originalRequest.url,
      method: originalRequest.method,
      response: error.response?.data
    });
  }
);

// Helper function to ensure API prefix
const ensureApiPrefix = (endpoint: string) => {
  if (!endpoint.startsWith('/api/')) {
    return `/api${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  }
  return endpoint;
};

// Create a typed API client
const typedApi = {
  get: <T>(url: string, config = {}) => 
    api.get<ApiResponse<T>>(ensureApiPrefix(url), config).then(response => response.data),
  
  post: <T>(url: string, data = {}, config = {}) => 
    api.post<ApiResponse<T>>(ensureApiPrefix(url), data, config).then(response => response.data),
  
  put: <T>(url: string, data = {}, config = {}) => 
    api.put<ApiResponse<T>>(ensureApiPrefix(url), data, config).then(response => response.data),
  
  delete: <T>(url: string, config = {}) => 
    api.delete<ApiResponse<T>>(ensureApiPrefix(url), config).then(response => response.data)
};

export default typedApi;
