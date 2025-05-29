import axios from 'axios';

// Version-agnostic axios error type
type AxiosErrorType = Error & {
  isAxiosError: boolean;
  response?: {
    status?: number;
    data?: any;
  };
  config?: any;
  code?: string;
};

export function handleApiError(error: unknown): Error {
  // Handle standard Error objects
  if (error instanceof Error) {
    // Check for axios error structure
    const axiosError = error as AxiosErrorType;
    
    if (axiosError.isAxiosError) {
      // Handle standardized error responses
      const errorData = axiosError.response?.data?.data || axiosError.response?.data;
      return new Error(
        errorData?.error || 
        errorData?.message || 
        axiosError.message ||
        'An unknown API error occurred'
      );
    }
    return new Error(error.message);
  }

  // Handle plain objects with error info
  if (typeof error === 'object' && error !== null) {
    const err = error as Record<string, any>;
    
    // Network errors (no response)
    if (!err.response) {
      return new Error(err.message || 'Network error - please check your connection');
    }

    const errorData = err.response.data?.data || err.response.data;
    const status = err.response.status;
    
    // Standard error responses
    if (errorData?.error) {
      return new Error(errorData.error);
    }
    
    if (errorData?.message) {
      return new Error(errorData.message);
    }
    
    // HTTP status code based errors
    switch (status) {
      case 401: return new Error('Please login again');
      case 403: return new Error('You don\'t have permission for this action');
      case 404: return new Error('Requested resource not found');
      case 500: return new Error('Server error - please try again later');
      default: return new Error(err.message || `Request failed with status ${status}`);
    }
  }

  return new Error('An unknown error occurred');
}
