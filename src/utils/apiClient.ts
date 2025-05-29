import axios from 'axios';
import { getApiUrl } from './apiUrl';
import { handleApiError } from './apiErrorHandler';

interface ApiResponse<T> {
  data: T;
  error?: string;
}

interface AuthEndpointsResponse {
  status: string;
  endpoints: string[];
}

interface TokenCheckResponse {
  error?: string;
  user?: {
    id: number;
    email: string;
    isAdmin: boolean;
  };
}

interface TokenResponse {
  token: string;
  refreshToken?: string;
}

const apiClient = axios.create({
  baseURL: getApiUrl(''),
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
    console.debug('[API Request]', {
      url: config.url,
      method: config.method,
      data: config.data,
      headers: config.headers
    });

    // Add token to request if available
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Remove any attempt to set cookie headers
    delete config.headers['Set-Cookie'];
    
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

    // Handle empty responses
    if (!response.data) {
      console.warn('[API Warning] Empty response received');
      return {
        ...response,
        data: {
          data: null,
          status: response.status,
          headers: response.headers
        }
      };
    }

    // Standardize successful responses
    const standardizedResponse = {
      ...response,
      data: {
        data: response.data,
        status: response.status,
        headers: response.headers
      }
    };

    // Log the standardized response for debugging
    console.debug('[Standardized Response]', standardizedResponse);

    return standardizedResponse;
  },
  async (error) => {
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
    
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }
        
        const response = await apiClient.post<TokenResponse>(getApiUrl('auth/refresh'), {
          refreshToken
        });
        
        const { token } = response.data;
        if (!token) {
          throw new Error('No token received from refresh');
        }

        localStorage.setItem('token', token);
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        return apiClient(originalRequest);
      } catch (refreshError) {
        console.error('[Token Refresh Error]', refreshError);
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(processedError);
  }
);

export default apiClient;
