import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

const API_BASE_URL = 'https://car-quizz.onrender.com';

// Define types for API responses
type Question = {
  id: number;
  question: string;
  options: string[];
  correctAnswer: string;
  category: string;
  difficulty: string;
};

type QuestionsResponse = {
  questions: Question[];
};

type AuthResponse = {
  token: string;
  refreshToken: string;
};

type CheckTokenResponse = {
  valid: boolean;
  user?: { id: string; email: string; isAdmin: boolean };
};

interface RefreshResponse {
  token: string;
  user: {
    id: string;
    email: string;
    isAdmin: boolean;
  };
}

// Create a custom Axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Enable sending cookies with requests - CRITICAL for CORS with credentials
  // Don't reject on HTTP error responses
  validateStatus: (status) => status < 500 // Only reject if status is server error
});

// Track if we're already trying to refresh the token
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

// Add a request interceptor to include the token
api.interceptors.request.use(
  async (config: any) => {
    const token = localStorage.getItem('token');
    const refreshToken = localStorage.getItem('refreshToken');

    // Enhanced logging
    console.log('API Request Interceptor:', {
      url: config.url,
      method: config.method,
      tokenExists: !!token,
      tokenLength: token?.length,
      tokenFirstChars: token?.substring(0, 10),
      refreshTokenExists: !!refreshToken,
      headers: config.headers
    });

    config.headers = config.headers || {};
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    // Add timeout to prevent hanging requests
    config.timeout = 10000; // 10 seconds

    return config;
  },
  (error) => {
    console.error('API Request Interceptor Error:', {
      error,
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => {
    // Log successful responses
    console.log('API Response:', {
      url: response.config.url,
      method: response.config.method,
      status: response.status,
      data: response.data
    });
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Enhanced error logging
    console.error('API Response Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data,
      error: error,
      errorName: error.name,
      errorMessage: error.message
    });

    // If the error status is 401 and there is no originalRequest._retry flag,
    // it means the token has expired and we need to refresh it
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers['Authorization'] = `Bearer ${token}`;
          return api(originalRequest);
        }).catch(err => {
          console.error('Failed to refresh token in queue:', err);
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refreshToken');

      try {
        const response = await axios.post(`${API_BASE_URL}/api/auth/refresh`, { refreshToken });
        
        // Type guard to ensure response.data has the expected structure
        let token = '';
        if (typeof response.data === 'object' && response.data !== null) {
          const { token: newToken, refreshToken: newRefreshToken } = response.data as { token: string, refreshToken?: string };

          if (newToken) {
            token = newToken;
            localStorage.setItem('token', token);
          }
          if (newRefreshToken) {
            localStorage.setItem('refreshToken', newRefreshToken);
          }
        } else {
          throw new Error('Invalid refresh token response');
        }

        processQueue(null, token);
        
        originalRequest.headers['Authorization'] = `Bearer ${token}`;
        return api(originalRequest);
      } catch (refreshError: any) {
        console.error('Token refresh failed:', {
          error: refreshError,
          response: refreshError.response,
          status: refreshError.response?.status,
          data: refreshError.response?.data
        });

        // Specific handling for different error types
        if (refreshError.response?.status === 403) {
          // Invalid refresh token
          console.log('Invalid refresh token, forcing logout');
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
        } else if (refreshError.response?.status === 401) {
          // Unauthorized, likely expired or invalid token
          console.log('Unauthorized refresh token, forcing logout');
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
        } else {
          // Generic error
          console.log('Unexpected error during token refresh, forcing logout');
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
        }

        processQueue(refreshError, null);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// Response interceptor for additional logging
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Response Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data
    });
    return Promise.reject(error);
  }
);

// Check token validity and refresh if needed
export async function checkTokenValidity(): Promise<{ valid: boolean; user?: { id: string; email: string; isAdmin: boolean } }> {
  const token = localStorage.getItem('token');
  const refreshToken = localStorage.getItem('refreshToken');

  if (!token) {
    return { valid: false };
  }

  try {
    // First try to validate the current token
    const response = await axios.get(`${API_BASE_URL}/api/auth/check-token`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = response.data as { valid: boolean; user?: { id: string; email: string; isAdmin: boolean } };
    
    // If token is valid, return the data
    if (data.valid) {
      return data;
    }

    // If token is invalid but we have a refresh token, try to refresh
    if (refreshToken) {
      try {
        const refreshResponse = await axios.post<RefreshResponse>(`${API_BASE_URL}/api/auth/refresh-token`, {
          refreshToken
        });

        const { token: newToken, user } = refreshResponse.data;
        
        // Store the new token
        localStorage.setItem('token', newToken);
        
        return {
          valid: true,
          user
        };
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        // Clear tokens on refresh failure
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        return { valid: false };
      }
    }

    return { valid: false };
  } catch (error) {
    console.error('Error checking token:', error);
    // Only clear tokens if it's an authentication error
    if (
      error &&
      typeof error === 'object' &&
      'isAxiosError' in error &&
      'response' in error &&
      error.response &&
      typeof error.response === 'object' &&
      'status' in error.response &&
      error.response.status === 401
    ) {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
    }
    return { valid: false };
  }
}

// Add axios interceptor to handle token refresh
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (!error.config) return Promise.reject(error);
    
    const originalRequest = error.config;

    // If the error is 401 and we haven't tried to refresh yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        const response = await axios.post<RefreshResponse>(`${API_BASE_URL}/api/auth/refresh-token`, {
          refreshToken
        });

        const { token: newToken } = response.data;
        localStorage.setItem('token', newToken);

        // Retry the original request with the new token
        originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
        return axios(originalRequest);
      } catch (refreshError) {
        console.error('Token refresh failed in interceptor:', refreshError);
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
