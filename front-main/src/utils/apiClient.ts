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

// Simple API client interface
interface IApiClient {
  get<T = any>(url: string, config?: any): Promise<T>;
  post<T = any>(url: string, data?: any, config?: any): Promise<T>;
  put<T = any>(url: string, data?: any, config?: any): Promise<T>;
  delete<T = any>(url: string, config?: any): Promise<T>;
  request<T = any>(config: any): Promise<{ data: T }>;
}

// Create a simple API client instance
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  timeout: 15000, // 15 seconds timeout
  transformResponse: function(data) {
    if (typeof data === 'string') {
      try {
        return JSON.parse(data);
      } catch (e) {
        return data;
      }
    }
    return data;
  }
});

// Add request interceptor to include auth token
api.interceptors.request.use((config) => {
  const token = TokenManager.getToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If the error is 401 and we haven't tried to refresh the token yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Try to refresh the token
        const refreshToken = TokenManager.getRefreshToken();
        if (refreshToken) {
          const response = await axios.post<AuthResponse>(`${getBaseUrl()}/api/auth/refresh`, { refreshToken });
          const { token, refreshToken: newRefreshToken } = response.data;
          
          // Update tokens in storage
          if (token && newRefreshToken) {
            TokenManager.setTokens(token, newRefreshToken);
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          }
        }
      } catch (error) {
        console.error('Error refreshing token:', error);
        TokenManager.clearTokens();
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

// Helper function to get base URL
function getBaseUrl(): string {
  if (typeof window === 'undefined') return ''; // SSR
  return window.location.origin;
}

// Create a typed API client
const apiClient: IApiClient = {
  get: async <T = any>(url: string, config?: any): Promise<T> => {
    const response = await api.get<T>(url, config);
    return response.data;
  },
  
  post: async <T = any>(url: string, data?: any, config?: any): Promise<T> => {
    const response = await api.post<T>(url, data, config);
    return response.data;
  },
  
  put: async <T = any>(url: string, data?: any, config?: any): Promise<T> => {
    const response = await api.put<T>(url, data, config);
    return response.data;
  },
  
  delete: async <T = any>(url: string, config?: any): Promise<T> => {
    const response = await api.delete<T>(url, config);
    return response.data;
  },
  
  request: async <T = any>(config: any): Promise<{ data: T }> => {
    const response = await api.request<T>(config);
    return { data: response.data };
  }
};

export default apiClient;
