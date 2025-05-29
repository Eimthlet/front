import axios from 'axios';

// Define types for API responses
interface ApiResponse<T> {
  data: T;
  error?: string;
  message?: string;
}

// Determine the API base URL based on the environment
const getBaseUrl = () => {
  // Use environment variable if available
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // In local development, use localhost
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:5001';
  }
  
  // Default to production URL
  return 'https://car-quizz.onrender.com';
};

// Create a custom Axios instance
const apiClient = axios.create({
  baseURL: getBaseUrl(),
  timeout: 30000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add token to request if available
    const token = localStorage.getItem('token');
    if (token && config.headers) {
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
  (response) => {
    // Return the response data directly
    return response;
  },
  (error) => {
    // Handle errors
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      return Promise.reject({
        message: error.response.data?.message || error.response.data?.error || 'An error occurred',
        status: error.response.status,
        data: error.response.data
      });
    } else if (error.request) {
      // The request was made but no response was received
      return Promise.reject({
        message: 'No response received from server',
        isNetworkError: true
      });
    } else {
      // Something happened in setting up the request that triggered an Error
      return Promise.reject({
        message: error.message || 'An error occurred while setting up the request'
      });
    }
  }
);

// Create typed API methods
const api = {
  get: <T>(url: string, config = {}) => 
    apiClient.get<ApiResponse<T>>(url, config).then(response => {
      // Handle different response structures
      if (response.data && typeof response.data === 'object') {
        // If response already has a data property, return that
        if ('data' in response.data) {
          return response.data.data;
        }
        // Otherwise return the whole response data
        return response.data;
      }
      return response.data;
    }),
  
  post: <T>(url: string, data = {}, config = {}) => 
    apiClient.post<ApiResponse<T>>(url, data, config).then(response => {
      // Handle different response structures
      if (response.data && typeof response.data === 'object') {
        // If response already has a data property, return that
        if ('data' in response.data) {
          return response.data.data;
        }
        // Otherwise return the whole response data
        return response.data;
      }
      return response.data;
    }),
  
  put: <T>(url: string, data = {}, config = {}) => 
    apiClient.put<ApiResponse<T>>(url, data, config).then(response => {
      // Handle different response structures
      if (response.data && typeof response.data === 'object') {
        // If response already has a data property, return that
        if ('data' in response.data) {
          return response.data.data;
        }
        // Otherwise return the whole response data
        return response.data;
      }
      return response.data;
    }),
  
  delete: <T>(url: string, config = {}) => 
    apiClient.delete<ApiResponse<T>>(url, config).then(response => {
      // Handle different response structures
      if (response.data && typeof response.data === 'object') {
        // If response already has a data property, return that
        if ('data' in response.data) {
          return response.data.data;
        }
        // Otherwise return the whole response data
        return response.data;
      }
      return response.data;
    })
};

export default api;
