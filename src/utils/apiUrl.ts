/**
 * Properly constructs API URLs and logs for debugging
 */
/**
 * Production API URL configuration (minimal version)
 */
export const getApiUrl = (endpoint: string): string => {
  // Remove duplicate '/api' prefix since backend routes already include it
  const cleanEndpoint = endpoint.replace(/^\/+|\/+$/g, '');
  return `https://car-quizz.onrender.com/${cleanEndpoint}`;
};

export const getApiUrlLocal = (endpoint: string): string => {
  const cleanEndpoint = endpoint.replace(/^\/+|\/+$/g, '');
  return `/api/${cleanEndpoint}`;
};

export const verifyApiConfig = (): void => {
  console.log('API Base URL:', getApiUrl(''));
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
