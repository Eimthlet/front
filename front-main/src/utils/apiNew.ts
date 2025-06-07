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

// Add response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is not 401 or request has already been retried, reject
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // If we're already refreshing, queue this request
    if (isRefreshing) {
      try {
        const token = await new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        });
        originalRequest.headers['Authorization'] = `Bearer ${token}`;
        return api(originalRequest);
      } catch (err) {
        return Promise.reject(err);
      }
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const refreshToken = localStorage.getItem('refreshToken');
      const response = await api.post('/auth/refresh', { refreshToken });

      const { token } = response.data;
      localStorage.setItem('token', token);
      api.defaults.headers['Authorization'] = `Bearer ${token}`;
      originalRequest.headers['Authorization'] = `Bearer ${token}`;

      processQueue(null, token);
      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError as Error, null);
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
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
