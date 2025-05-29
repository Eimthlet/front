/**
 * Properly constructs API URLs and logs for debugging
 */
/**
 * Production API URL configuration
 */
export const getApiUrl = (endpoint: string): string => {
  const baseUrl = 'https://car-quizz.onrender.com/api';
  const cleanEndpoint = endpoint.replace(/^\/+|\/+$/g, '');
  
  if (process.env.NODE_ENV === 'development') {
    console.debug('[API] Request to:', `${baseUrl}/${cleanEndpoint}`);
  }
  
  return `${baseUrl}/${cleanEndpoint}`;
};

export const getApiUrlLocal = (endpoint: string): string => {
  const cleanEndpoint = endpoint.replace(/^\/+|\/+$/g, '');
  return `/api/${cleanEndpoint}`;
};

export const verifyApiConfig = (): void => {
  if (!process.env.REACT_APP_API_BASE_URL) {
    console.warn('API base URL using fallback to car-quizz.onrender.com');
  }
};
