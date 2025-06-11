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

// Define the API client interface
interface IApiClient {
  get<T = any>(url: string, config?: any): Promise<T>;
  post<T = any>(url: string, data?: any, config?: any): Promise<T>;
  put<T = any>(url: string, data?: any, config?: any): Promise<T>;
  delete<T = any>(url: string, config?: any): Promise<T>;
  request<T = any>(config: any): Promise<{ data: T }>;
}

// Create a simple API client instance
const api = axios.create({
  baseURL: process.env.NODE_ENV === 'development' 
    ? 'http://localhost:5000' 
    : 'https://car-quizz.onrender.com',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Always send cookies with requests
  timeout: 15000, // 15 seconds timeout
});

// Add request interceptor to handle API prefix and auth token
api.interceptors.request.use((config) => {
  // Add API prefix if not present
  if (config.url && !config.url.startsWith('/api/') && !config.url.startsWith('http')) {
    config.url = `/api${config.url.startsWith('/') ? '' : '/'}${config.url}`;
  }
  
  // Add auth token if available
  const token = TokenManager.getToken();
  if (token) {
    config.headers = {
      ...config.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }
  
  // Ensure credentials are always sent
  config.withCredentials = true;
  
  return config;
});

// Add response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => {
    // Parse JSON response if needed
    if (typeof response.data === 'string') {
      try {
        response.data = JSON.parse(response.data);
      } catch (e) {
        console.error('Error parsing response data:', e);
      }
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // If the error is 401 and we haven't tried to refresh the token yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Try to refresh the token
        const refreshToken = TokenManager.getRefreshToken();
        if (refreshToken) {
          const baseUrl = process.env.NODE_ENV === 'development' 
            ? 'http://localhost:5000' 
            : 'https://car-quizz.onrender.com';
          const response = await axios.post<AuthResponse>(
            `${baseUrl}/api/auth/refresh`, 
            { refreshToken },
            { withCredentials: true }
          );
          
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
        // Clear tokens and redirect to login
        TokenManager.clearTokens();
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

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
