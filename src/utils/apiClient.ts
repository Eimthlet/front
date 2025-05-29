import axios from 'axios';
import { handleApiError } from './apiErrorHandler';

type AuthResponse = {
  token: string;
  refreshToken?: string;
  error?: string;
};

const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If error is not 401 or we're already refreshing, reject
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;
    
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) throw new Error('No refresh token');
      
      const { data } = await axios.post<AuthResponse>(
        `${process.env.REACT_APP_API_BASE_URL}/api/auth/refresh`,
        { refreshToken }
      );
      
      if (data.error) throw new Error(data.error);
      
      localStorage.setItem('token', data.token);
      if (data.refreshToken) {
        localStorage.setItem('refreshToken', data.refreshToken);
      }
      
      originalRequest.headers.Authorization = `Bearer ${data.token}`;
      return apiClient(originalRequest);
    } catch (refreshError) {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      return Promise.reject(refreshError);
    }
  }
);

export const setAuthToken = (token: string) => {
  apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
};

export default apiClient;
