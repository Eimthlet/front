import axios from 'axios';
import TokenManager from './TokenManager';

// Define the AuthResponse interface for token refresh
interface AuthResponse {
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
    'Accept': 'application/json',
  },
  withCredentials: true,
  timeout: 10000, // 10 seconds timeout
  transformResponse: (data: any) => {
    // Parse the response data if it's a string
    if (typeof data === 'string') {
      try {
        return JSON.parse(data);
      } catch (e) {
        console.error('Error parsing response data:', e);
        return data;
      }
    }
    return data;
  }
});

// Log the base URL being used
console.log('API Base URL:', baseUrl);

// Add a request interceptor to include the auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    console.log('Sending request to:', config.url);
    // Conditionally log request data, excluding it for sensitive paths like login/register
    const isSensitivePath = config.url?.includes('/auth/login') || config.url?.includes('/auth/register');
    console.log('Request config:', {
      method: config.method,
      baseURL: config.baseURL,
      url: config.url,
      data: isSensitivePath ? '[REDACTED FOR SENSITIVE REQUEST]' : config.data,
      headers: config.headers
    });
    
    const token = TokenManager.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => {
    try {
      // Log the response details
      const responseUrl = response?.config?.url || 'unknown';
      console.log(`[API] Response from ${responseUrl} (${response.status})`);
      
      // Check if response.data exists and is a string that needs parsing
      if (response.data) {
        if (typeof response.data === 'string') {
          try {
            // Try to parse the response data if it's a string
            const parsedData = JSON.parse(response.data);
            console.log('[API] Parsed response data:', parsedData);
            response.data = parsedData;
          } catch (e) {
            console.log('[API] Response data is not JSON, using as-is');
          }
        } else {
          console.log('[API] Response data:', response.data);
        }
      } else {
        console.log('[API] No data in response');
      }
      
      // Log response headers for debugging
      if (response.headers) {
        console.log('[API] Response headers:', response.headers);
      }
      
      return response;
    } catch (error) {
      console.error('[API] Error processing response:', error);
      return response; // Still return the original response even if logging fails
    }
  },
  async (error) => {
    console.error('API Error:', {
      message: error.message,
      status: error.response?.status,
      url: error.config?.url,
      method: error.config?.method,
      data: error.response?.data
    });

    const originalRequest = error.config;
    
    // If the error status is 401 and we haven't tried to refresh the token yet
    if (error.response?.status === 401 && !originalRequest?._retry) {
      console.log('Attempting to refresh token...');
      originalRequest._retry = true;
      
      try {
        const refreshToken = TokenManager.getRefreshToken();
        if (!refreshToken) {
          console.log('No refresh token available, redirecting to login');
          TokenManager.clearTokens();
          window.location.href = '/login';
          return Promise.reject(error);
        }
        
        // Try to refresh the token
        const response = await axios.post(`${baseUrl}/auth/refresh`, { refreshToken });
        
        // Cast the response data to AuthResponse
        const authResponse = response.data as AuthResponse;
        TokenManager.setTokens(authResponse.token, authResponse.refreshToken);
        
        // Retry the original request with the new token
        originalRequest.headers.Authorization = `Bearer ${authResponse.token}`;
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