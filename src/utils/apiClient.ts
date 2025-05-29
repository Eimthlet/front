import axios from 'axios';
import { getApiUrl } from './apiUrl';
import { handleApiError } from './apiErrorHandler';

interface ApiResponse<T> {
  data: T;
  error?: string;
}

const apiClient = axios.create({
  baseURL: getApiUrl(''),
  timeout: 15000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    console.debug('[API Request]', {
      url: config.url,
      method: config.method,
      data: config.data,
      headers: config.headers
    });
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('[API Request Error]', error);
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    console.debug('[API Response]', {
      url: response.config.url,
      status: response.status,
      data: response.data,
      headers: response.headers
    });
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
    console.error('[API Response Error]', {
      url: error.config?.url,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
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
