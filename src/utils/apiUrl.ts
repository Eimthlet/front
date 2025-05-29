/**
 * Properly constructs API URLs to prevent duplicate path segments
 * @param endpoint API endpoint path (e.g. 'auth/register')
 * @returns Properly formatted URL
 */
export const getApiUrl = (endpoint: string): string => {
  // Remove any leading/trailing slashes
  const cleanEndpoint = endpoint.replace(/^\/+|\/+$/g, '');
  
  // The backend is hosted at https://car-quizz.onrender.com/api
  // So we need to ensure we don't duplicate '/api'
  return `/api/${cleanEndpoint}`;
};
