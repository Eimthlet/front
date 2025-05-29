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

export const verifyEndpoints = async (): Promise<void> => {
  const endpoints = [
    'auth',
    'auth/login', 
    'auth/register',
    'auth/logout',
    'auth/check-token'
  ];

  console.group('API Endpoint Verification');
  for (const endpoint of endpoints) {
    try {
      const url = getApiUrl(endpoint);
      console.log(`Verifying: ${url}`);
      // Test OPTIONS for CORS
      await fetch(url, { method: 'OPTIONS' });
      console.log(`✅ ${endpoint} - CORS OK`);
    } catch (error) {
      console.error(`❌ ${endpoint} -`, error);
    }
  }
  console.groupEnd();
};
