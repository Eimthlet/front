import axios from 'axios';

// Define types for API responses
export interface ApiResponse<T> {
  data: T;
  error?: string;
  message?: string;
}

// Determine the API base URL based on the environment
const getBaseUrl = () => {
  let baseUrl = '';
  // Use environment variable if available
  if (process.env.REACT_APP_API_URL) {
    console.log('Using API URL from environment:', process.env.REACT_APP_API_URL);
    baseUrl = process.env.REACT_APP_API_URL;
  }
  
  // In local development, use localhost
  else if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    console.log('Using localhost API URL');
    baseUrl = 'http://localhost:5001';
  }
  
  // Default to production URL
  else {
    console.log('Using default production API URL');
    baseUrl = 'https://car-quizz.onrender.com';
  }

  // Defensively remove trailing /api or / from the baseUrl
  if (baseUrl.endsWith('/api')) {
    baseUrl = baseUrl.slice(0, -4);
  }
  if (baseUrl.endsWith('/')) {
    baseUrl = baseUrl.slice(0, -1);
  }
  
  return baseUrl;
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
    
    console.log(`[Request Interceptor] Original URL: ${config.url}`);
    // Defensively remove '/api' from the start of the URL path
    if (config.url && config.url.startsWith('/api/')) {
      config.url = config.url.substring(4);
      console.log(`[Request Interceptor] Modified URL: ${config.url}`);
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
    apiClient.get<T>(url, config).then(response => response.data),
  
  post: <T>(url: string, data = {}, config = {}) => 
    apiClient.post<T>(url, data, config).then(response => response.data),
  
  put: <T>(url: string, data = {}, config = {}) => 
    apiClient.put<T>(url, data, config).then(response => response.data),
  
  delete: <T>(url: string, config = {}) => 
    apiClient.delete<T>(url, config).then(response => response.data)
};

export default api;
