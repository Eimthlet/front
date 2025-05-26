import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

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

// Create a custom Axios instance with retry logic
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // Increased timeout to 30 seconds
  headers: {
    'Content-Type': 'application/json'
  }
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
    const token = localStorage.getItem('token');
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
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
    // Transform the response to ensure consistent data structure
    if (response.data && typeof response.data === 'object') {
      // If the response already has a data property, return as is
      if ('data' in response.data) {
        return response;
      }
      // Otherwise, wrap the response in a data property
      response.data = { data: response.data };
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

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
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        const response = await axios.post(`${API_BASE_URL}/api/auth/refresh`, { refreshToken });
        
        const { token: newToken, refreshToken: newRefreshToken } = response.data as { token: string; refreshToken?: string };
        
        if (newToken) {
          localStorage.setItem('token', newToken);
          if (newRefreshToken) {
            localStorage.setItem('refreshToken', newRefreshToken);
          }
          
          processQueue(null, newToken);
          originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
          return api(originalRequest);
        }
        
        throw new Error('Invalid refresh token response');
      } catch (refreshError) {
        processQueue(refreshError as Error, null);
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Handle other errors
    const errorMessage = error.response?.data?.error || 
                        error.response?.data?.message || 
                        error.message || 
                        'An unexpected error occurred';
    
    console.error('API Error:', {
      status: error.response?.status,
      message: errorMessage,
      url: originalRequest.url,
      method: originalRequest.method,
      response: error.response?.data
    });

    return Promise.reject({
      message: errorMessage,
      status: error.response?.status,
      originalError: error,
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
