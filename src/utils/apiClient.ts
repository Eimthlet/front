import axios from 'axios';
import { handleApiError } from './apiErrorHandler';

interface ApiResponse<T> {
  data: T;
  error?: string;
}

const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL,
  timeout: 10000,
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
  (error) => Promise.reject(error)
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    // Validate response structure
    if (process.env.NODE_ENV === 'development' && !response.data) {
      console.warn('[API WARNING] Empty response.data', {
        url: response.config.url,
        response
      });
    }
    
    // Standardize successful responses
    const data = response.data as ApiResponse<any>;
    return {
      ...response,
      data: data.data || data
    };
  },
  (error) => {
    // Enhanced error logging
    if (error.response) {
      console.error('[API ERROR]', {
        url: error.config.url,
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers
      });
    } else {
      console.error('[API NETWORK ERROR]', error);
    }
    
    return Promise.reject(handleApiError(error));
  }
);

export default apiClient;
