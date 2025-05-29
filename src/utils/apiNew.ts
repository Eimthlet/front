import axios from 'axios';
import { handleApiError } from './apiErrorHandler';

// Define types locally to avoid axios type import issues
type AxiosRequestConfig = {
  url?: string;
  method?: 'get' | 'post' | 'put' | 'delete' | 'patch' | 'head' | 'options';
  baseURL?: string;
  headers?: Record<string, string>;
  params?: any;
  data?: any;
  timeout?: number;
  withCredentials?: boolean;
  // Custom properties
  _skipAuth?: boolean;
  _retry?: boolean;
};

type AxiosResponse<T = any> = {
  data: T;
  status: number;
  statusText: string;
  headers: any;
  config: AxiosRequestConfig;
  request?: any;
};

type AxiosError = Error & {
  config: AxiosRequestConfig;
  code?: string;
  request?: any;
  response?: AxiosResponse;
  isAxiosError: boolean;
  toJSON: () => object;
};

// API response type that matches our backend response structure
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
}) as any; // Type assertion to avoid axios type issues

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
  (config: AxiosRequestConfig) => {
    const token = localStorage.getItem('token');
    if (token && typeof config.headers === 'object' && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: any) => {
    return Promise.reject(handleApiError(error));
  }
);

// Response interceptor for handling token refresh and errors
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error: AxiosError) => {
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

        // Create a new axios instance without interceptors for the refresh token request
        const refreshAxios = axios.create({
          baseURL: API_BASE_URL,
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
          },
          withCredentials: false
        });

        const response = await refreshAxios.post<{
          token: string;
          refreshToken: string;
        }>(
          '/api/auth/refresh',
          { refreshToken }
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
type RequestMethod = 'get' | 'post' | 'put' | 'delete';

export const apiRequest = async <T>(
  method: RequestMethod,
  url: string,
  data?: any,
  config: AxiosRequestConfig = {}
): Promise<ApiResponse<T>> => {
  try {
    // Create a new config object with method and url
    const requestConfig: AxiosRequestConfig = {
      ...config,
      method,
      url,
    };
    
    // Only add data for methods that can have a body
    if (method !== 'get' && method !== 'delete') {
      requestConfig.data = data;
    } else if (method === 'get') {
      // For GET requests, add data as params
      requestConfig.params = data;
    }
    
    // Make the request and handle the response
    const response = await api.request(requestConfig) as unknown as AxiosResponse<T>;
    
    return { 
      data: response.data, 
      status: response.status 
    };
  } catch (error: any) {
    const axiosError = error as AxiosError;
    return {
      error: error.message || 'An error occurred',
      details: axiosError.response?.data,
      status: axiosError.response?.status,
    };
  }
};

// Typed API methods
export const apiClient = {
  /**
   * Set or clear the authentication token
   * @param token The JWT token or null to clear
   */
  setAuthToken: (token: string | null) => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete api.defaults.headers.common['Authorization'];
    }
  },

  /**
   * Send a GET request
   * @param url The URL to send the request to
   * @param params Optional query parameters
   * @param config Additional axios config
   */
  get: <T>(url: string, params: any = {}, config: AxiosRequestConfig = {}): Promise<ApiResponse<T>> => {
    return apiRequest<T>('get', url, params, config);
  },

  /**
   * Send a POST request
   * @param url The URL to send the request to
   * @param data The data to send in the request body
   * @param config Additional axios config
   */
  post: <T>(url: string, data: any = {}, config: AxiosRequestConfig = {}): Promise<ApiResponse<T>> => {
    return apiRequest<T>('post', url, data, config);
  },

  /**
   * Send a PUT request
   * @param url The URL to send the request to
   * @param data The data to send in the request body
   * @param config Additional axios config
   */
  put: <T>(url: string, data: any = {}, config: AxiosRequestConfig = {}): Promise<ApiResponse<T>> => {
    return apiRequest<T>('put', url, data, config);
  },

  /**
   * Send a DELETE request
   * @param url The URL to send the request to
   * @param config Additional axios config
   */
  delete: <T>(url: string, config: AxiosRequestConfig = {}): Promise<ApiResponse<T>> => {
    return apiRequest<T>('delete', url, undefined, config);
  },

  /**
   * Get the underlying axios instance for advanced usage
   * @returns The axios instance
   */
  getInstance: () => {
    return api;
  }
};

export default apiClient;
