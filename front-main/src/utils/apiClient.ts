import axios from 'axios';

// Define the API response type
export interface ApiResponse<T = any> {
  data: T;
  error?: string;
  message?: string;
  success?: boolean;
}

// Define request config interface
interface RequestConfig {
  headers?: Record<string, string>;
  params?: Record<string, any>;
  [key: string]: any;
}

// Define the API client type - returns unwrapped data, not ApiResponse
type ApiClient = {
  get: <T = any>(url: string, config?: any) => Promise<T>;
  post: <T = any, D = any>(url: string, data?: D, config?: any) => Promise<T>;
  put: <T = any, D = any>(url: string, data?: D, config?: any) => Promise<T>;
  delete: <T = any>(url: string, config?: any) => Promise<T>;
};

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
const apiClient = axios.create({
  baseURL: baseUrl,
  timeout: 30000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Helper function to extract data from API response
const extractApiData = <T,>(response: any): T => {
  // Handle both wrapped ApiResponse and direct response
  if (response && typeof response === 'object' && 'data' in response) {
    return response.data;
  }
  return response;
};

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add token to request if available
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    if (config.url) {
      // Skip URL modification for full URLs
      if (config.url.startsWith('http')) {
        return config;
      }

      // Remove any leading slashes
      let cleanUrl = config.url.replace(/^\/+/, '');
      
      // Handle auth endpoints (should not have /api prefix)
      if (cleanUrl.startsWith('auth/')) {
        config.url = `/${cleanUrl}`;
      } 
      // Handle admin endpoints (should not have /api prefix)
      else if (cleanUrl.startsWith('admin/') || cleanUrl.startsWith('api/admin/')) {
        // Remove any existing /api prefix
        cleanUrl = cleanUrl.replace(/^api\//, '');
        config.url = `/${cleanUrl}`;
      }
      // For all other requests that don't start with /api, add it
      else if (!cleanUrl.startsWith('api/')) {
        config.url = `/api/${cleanUrl}`;
      } else {
        // If it already starts with api/, just ensure it has a leading slash
        config.url = `/${cleanUrl}`;
      }
      
      // Log the final URL for debugging
      console.log(`Processed URL: ${config.url}`);
    }
    
    // Log the request URL for debugging (without sensitive data)
    const fullUrl = `${config.baseURL}${config.url}`.replace(/([^:]\/)\/+/g, '$1');
    console.log(`[Request] ${config.method?.toUpperCase()} ${fullUrl}`);
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response: any) => {
    // Log the response for debugging
    console.log('[Response]', response.config.method?.toUpperCase(), response.config.url, response.status);
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

// Create typed API methods that return unwrapped data
const api: ApiClient = {
  get: <T = any>(url: string, config?: any) => 
    new Promise<T>((resolve, reject) => {
      apiClient.get<T>(url, config)
        .then((response) => {
          const data = extractApiData<T>(response.data);
          resolve(data);
        })
        .catch(reject);
    }),
    
  post: <T = any, D = any>(url: string, data?: D, config?: any) => 
    new Promise<T>((resolve, reject) => {
      apiClient.post<T>(url, data, config)
        .then((response) => {
          const responseData = extractApiData<T>(response.data);
          resolve(responseData);
        })
        .catch(reject);
    }),
    
  put: <T = any, D = any>(url: string, data?: D, config?: any) => 
    new Promise<T>((resolve, reject) => {
      apiClient.put<T>(url, data, config)
        .then((response) => {
          const responseData = extractApiData<T>(response.data);
          resolve(responseData);
        })
        .catch(reject);
    }),
    
  delete: <T = any>(url: string, config?: any) => 
    new Promise<T>((resolve, reject) => {
      apiClient.delete<T>(url, config)
        .then((response) => {
          const responseData = extractApiData<T>(response.data);
          resolve(responseData);
        })
        .catch(reject);
    })
};

export default api;