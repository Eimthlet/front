import axios from 'axios';

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
}

export const handleApiError = (error: unknown): ApiError => {
  // Handle standard Error objects
  if (error instanceof Error) {
    // Check for axios error structure
    const axiosError = error as {
      isAxiosError?: boolean;
      response?: {
        status?: number;
        data?: any;
      };
      code?: string;
    };
    
    if (axiosError.isAxiosError) {
      return {
        message: (axiosError.response?.data as any)?.error || error.message,
        status: axiosError.response?.status,
        code: axiosError.code
      };
    }
    return { message: error.message };
  }
  return { message: 'An unknown error occurred' };
};
