import axios from 'axios';
import { handleApiError } from './apiErrorHandler';

interface ApiResponse<T> {
  data: T;
  error?: string;
}

const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  timeout: 10000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
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
    // Standardize successful responses
    return {
      ...response,
      data: {
        data: response.data, // Actual response data
        status: response.status,
        headers: response.headers
      }
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
    
    // Process and standardize errors
    const processedError = handleApiError(error);
    return Promise.reject(processedError);
  }
);

export default apiClient;
