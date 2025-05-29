import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { handleApiError } from './apiErrorHandler';

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  details?: any;
  status?: number;
}

const API_BASE_URL = 'https://car-quizz.onrender.com';

// Create a new axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Track if we're currently refreshing the token
let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (error: Error) => void }> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
};

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(handleApiError(error));
  }
);

// Response interceptor for handling token refresh and errors
api.interceptors.response.use(
  (response) => {
    // Return successful responses directly
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized errors
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If we're already refreshing, add to queue
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        // Try to refresh the token
        const response = await axios.post<{
          token: string;
          refreshToken: string;
        }>(
          `${API_BASE_URL}/api/auth/refresh`,
          { refreshToken },
          { _skipAuth: true } // Skip auth for refresh endpoint
        );

        const { token: newToken, refreshToken: newRefreshToken } = response.data;

        // Store the new tokens
        localStorage.setItem('token', newToken);
        if (newRefreshToken) {
          localStorage.setItem('refreshToken', newRefreshToken);
        }

        // Update the authorization header
        originalRequest.headers.Authorization = `Bearer ${newToken}`;

        // Process the queue with the new token
        processQueue(null, newToken);
        
        // Retry the original request
        return api(originalRequest);
      } catch (error) {
        // If refresh fails, clear tokens and redirect to login
        processQueue(error as Error);
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(handleApiError(error));
      } finally {
        isRefreshing = false;
      }
    }

    // For other errors, use our error handler
    return Promise.reject(handleApiError(error));
  }
);

// Helper function to make API requests with proper typing
export const apiRequest = async <T>(
  method: 'get' | 'post' | 'put' | 'delete',
  url: string,
  data?: any,
  config?: AxiosRequestConfig
): Promise<ApiResponse<T>> => {
  try {
    const response = await api.request<T>({
      method,
      url,
      data,
      ...config,
    });
    return { data: response.data, status: response.status };
  } catch (error: any) {
    return {
      error: error.message || 'An error occurred',
      details: error.details,
      status: error.status,
    };
  }
};

// Typed API methods
export const apiClient = {
  get: <T>(url: string, config?: AxiosRequestConfig) =>
    apiRequest<T>('get', url, undefined, config),
  
  post: <T>(url: string, data?: any, config?: AxiosRequestConfig) =>
    apiRequest<T>('post', url, data, config),
  
  put: <T>(url: string, data?: any, config?: AxiosRequestConfig) =>
    apiRequest<T>('put', url, data, config),
  
  delete: <T>(url: string, config?: AxiosRequestConfig) =>
    apiRequest<T>('delete', url, undefined, config),
};

export default apiClient;
