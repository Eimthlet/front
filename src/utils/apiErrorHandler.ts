import { AxiosError } from 'axios';

export interface ApiError {
  message: string;
  status?: number;
  details?: any;
}

export const handleApiError = (error: unknown): ApiError => {
  if (error instanceof Error) {
    if ('response' in error) {
      const axiosError = error as AxiosError;
      return {
        message: (axiosError.response?.data as any)?.error || axiosError.message,
        status: axiosError.response?.status,
        details: (axiosError.response?.data as any)?.details
      };
    }
    return { message: error.message };
  }
  return { message: 'An unknown error occurred' };
};
