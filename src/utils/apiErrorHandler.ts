import type { AxiosError } from 'axios';

type ApiError = {
  response?: {
    status?: number;
    data?: {
      error?: string;
      message?: string;
      details?: any;
    };
  };
  message?: string;
  code?: string;
  isAxiosError?: boolean;
};

export function handleApiError(error: unknown): Error {
  // Handle standard Error objects
  if (error instanceof Error) {
    // Check for axios error structure
    const axiosError = error as AxiosError;
    
    if (axiosError.isAxiosError) {
      return new Error(
        (axiosError.response?.data as any)?.error || 
        (axiosError.response?.data as any)?.message || 
        axiosError.message
      );
    }
    return new Error(error.message);
  }

  // Handle plain objects with error info
  if (typeof error === 'object' && error !== null) {
    const err = error as ApiError;
    
    // Network errors (no response)
    if (!err.response) {
      return new Error(err.message || 'Network error - please check your connection');
    }

    const { status, data } = err.response;
    
    // Standard error responses
    if (data?.error) {
      return new Error(data.error);
    }
    
    if (data?.message) {
      return new Error(data.message);
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
