/**
 * Global configuration for the Car Quiz application
 * This file centralizes all environment-specific configuration
 */

// API configuration
export const API_CONFIG = {
  // Always use the production backend URL
  // This ensures consistent behavior across all environments
  BASE_URL: 'https://car-quizz.onrender.com',
  
  // Timeout for API requests in milliseconds
  TIMEOUT: 30000,
  
  // Whether to include credentials with requests
  WITH_CREDENTIALS: true,
  
  // Headers to include with all requests
  HEADERS: {
    'Content-Type': 'application/json',
  }
};

// Authentication configuration
export const AUTH_CONFIG = {
  // Token storage keys
  TOKEN_KEY: 'token',
  REFRESH_TOKEN_KEY: 'refreshToken',
  
  // Authentication endpoints
  ENDPOINTS: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    LOGOUT: '/api/auth/logout',
    REFRESH: '/api/auth/refresh',
    CHECK_TOKEN: '/api/auth/check-token',
    VERIFY_PAYMENT: '/api/auth/verify-payment'
  }
};

// Payment configuration
export const PAYMENT_CONFIG = {
  // PayChangu callback URL - always use production URL
  CALLBACK_URL: 'https://car-quizz.onrender.com/api/paychangu-callback',
  
  // Return URL after payment
  RETURN_URL: window.location.origin + '/login?payment=success',
  
  // Currency
  CURRENCY: 'MWK'
};

// Export all configurations as default
export default {
  API: API_CONFIG,
  AUTH: AUTH_CONFIG,
  PAYMENT: PAYMENT_CONFIG
};
