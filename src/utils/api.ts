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

interface FailedRequest {
  resolve: (token: string) => void;
  reject: (error: Error) => void;
}

// Create a custom Axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000, // Reduced timeout to 15 seconds
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

// Add a response interceptor to handle token refresh and errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle timeout errors
    if (error.code === 'ECONNABORTED') {
      console.error('Request timeout:', {
        url: originalRequest.url,
        method: originalRequest.method
      });
      return Promise.reject({
        message: 'Request timed out. Please check your internet connection and try again.',
        originalError: error
      });
    }

    // Handle network errors
    if (!error.response) {
      console.error('Network error:', error);
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
      method: originalRequest.method
    });

    return Promise.reject({
      message: errorMessage,
      status: error.response?.status,
      originalError: error
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
    api.get<T>(ensureApiPrefix(url), config),
  
  post: <T>(url: string, data = {}, config = {}) => 
    api.post<T>(ensureApiPrefix(url), data, config),
  
  put: <T>(url: string, data = {}, config = {}) => 
    api.put<T>(ensureApiPrefix(url), data, config),
  
  delete: <T>(url: string, config = {}) => 
    api.delete<T>(ensureApiPrefix(url), config)
};

export default typedApi;
