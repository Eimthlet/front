/**
 * Properly constructs API URLs and logs for debugging
 */
/**
 * Production API URL configuration
 */
export const getApiUrl = (endpoint: string): string => {
  const baseUrl = 'https://car-quizz.onrender.com';
  const cleanEndpoint = endpoint.replace(/^\/+|\/+$/g, '').replace('/api/', '/');
  return `${baseUrl}/${cleanEndpoint}`;
};

// For local development if needed
export const getApiUrlLocal = (endpoint: string): string => {
  const baseUrl = 'http://localhost:5000';
  const cleanEndpoint = endpoint.replace(/^\/+|\/+$/g, '').replace('/api/', '/');
  return `${baseUrl}/${cleanEndpoint}`;
};

export const verifyApiConfig = (): void => {
  if (process.env.NODE_ENV === 'development') {
    console.log('API Base URL:', getApiUrl(''));
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
