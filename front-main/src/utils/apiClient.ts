import axios from 'axios';
import TokenManager from './TokenManager';

// Define the AuthResponse interface here since it's not in types
export interface AuthResponse {
  token: string;
  refreshToken: string;
  user?: {
    id: number;
    username: string;
    email: string;
  };
}

// Define Axios types for v1.9.0
type AxiosRequestConfig = any;
type AxiosResponse<T = any> = {
  data: T;
  status: number;
  statusText: string;
  headers: any;
  config: any;
  request?: any;
};

type InternalAxiosRequestConfig = any;
type AxiosInstance = any;

// Define the API client type - returns unwrapped data, not ApiResponse
interface IApiClient {
  get(url: string, config?: AxiosRequestConfig): Promise<any>;
  post(url: string, data?: any, config?: AxiosRequestConfig): Promise<any>;
  put(url: string, data?: any, config?: AxiosRequestConfig): Promise<any>;
  delete(url: string, config?: AxiosRequestConfig): Promise<any>;
  request(config: AxiosRequestConfig): Promise<AxiosResponse>;
}

// Determine the API base URL based on the environment
const getBaseUrl = () => {
  let baseUrl = '';
  // Use environment variable if available
  if (process.env.REACT_APP_API_URL) {
    baseUrl = process.env.REACT_APP_API_URL;
  }
  // In local development, use localhost
  else if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    baseUrl = 'http://localhost:5001';
  }
  // Default to production URL
  else {
    baseUrl = 'https://car-quizz.onrender.com';
  }

  // Remove any trailing slashes and /api if present
  return baseUrl.replace(/\/+$/, '').replace(/\/api$/, '');
};

// Get base URL without any trailing slashes
const baseUrl = getBaseUrl().replace(/\/+$/, '');

// Create a custom Axios instance
const api: AxiosInstance = axios.create({
  baseURL: baseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Add a request interceptor to include the auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = TokenManager.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If the error status is 401 and we haven't tried to refresh the token yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = TokenManager.getRefreshToken();
        if (!refreshToken) {
          // No refresh token available, redirect to login
          TokenManager.clearTokens();
          window.location.href = '/login';
          return Promise.reject(error);
        }
        
        // Try to refresh the token
        const response = await axios.post<AuthResponse>(
          `${baseUrl}/auth/refresh-token`,
          { refreshToken }
        );
        
        const { token: newToken, refreshToken: newRefreshToken } = response.data;
        TokenManager.setTokens(newToken, newRefreshToken);
        
        // Retry the original request with the new token
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Failed to refresh token, clear tokens and redirect to login
        TokenManager.clearTokens();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

// Create a typed API client that matches our IApiClient interface
const apiClient: IApiClient = {
  get: async (url: string, config?: AxiosRequestConfig) => {
    const response = await api.get(url, config) as AxiosResponse;
    return response.data;
  },
  
  post: async (url: string, data?: any, config?: AxiosRequestConfig) => {
    const response = await api.post(url, data, config) as AxiosResponse;
    return response.data;
  },
  
  put: async (url: string, data?: any, config?: AxiosRequestConfig) => {
    const response = await api.put(url, data, config) as AxiosResponse;
    return response.data;
  },
  
  delete: async (url: string, config?: AxiosRequestConfig) => {
    const response = await api.delete(url, config) as AxiosResponse;
    return response.data;
  },
  
  request: async (config: AxiosRequestConfig) => {
    return api.request(config) as AxiosResponse;
  }
};

export default apiClient;