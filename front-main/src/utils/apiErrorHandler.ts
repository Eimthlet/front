
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

// Define a more specific error structure that includes an optional code
export interface NormalizedApiError {
  message: string;
  code?: string; // e.g., 'ECONNABORTED', 'INVALID_CREDENTIALS', etc.
  status?: number; // HTTP status code, if applicable
}

export function handleApiError(error: unknown): NormalizedApiError {
  // Handle standard Error objects
  if (error instanceof Error) {
    // Check for axios error structure
    const axiosError = error as AxiosErrorType;
    
    if (axiosError.isAxiosError) {
      // Handle standardized error responses
      const errorData = axiosError.response?.data?.data || axiosError.response?.data;
      return {
        message: errorData?.error || 
                 errorData?.message || 
                 axiosError.message ||
                 'An unknown API error occurred',
        code: axiosError.code, // Preserve Axios error code if present
        status: axiosError.response?.status
      };
    }
    // If it's a standard Error but not an Axios error, it might not have a specific code or status
      return { message: error.message };
  }

  // Handle plain objects with error info
  if (typeof error === 'object' && error !== null) {
    const err = error as Record<string, any>;
    
    // Network errors (no response)
    if (!err.response) {
      return { message: err.message || 'Network error - please check your connection', code: err.code }; // Preserve code if it's a network error with a code
    }

    const errorData = err.response.data?.data || err.response.data;
    const status = err.response.status;
    
    // Standard error responses
    if (errorData?.error) {
      return { message: errorData.error, status };
    }
    
    if (errorData?.message) {
      return { message: errorData.message, status };
    }
    
    // HTTP status code based errors
    switch (status) {
      case 401: return { message: 'Please login again', status: 401, code: 'UNAUTHENTICATED' };
      case 403: return { message: 'You don\'t have permission for this action', status: 403, code: 'FORBIDDEN' };
      case 404: return { message: 'Requested resource not found', status: 404, code: 'NOT_FOUND' };
      case 500: return { message: 'Server error - please try again later', status: 500, code: 'SERVER_ERROR' };
      default: return { message: err.message || `Request failed with status ${status}`, status, code: 'HTTP_ERROR' };
    }
  }

  return { message: 'An unknown error occurred', code: 'UNKNOWN_ERROR' };
}
