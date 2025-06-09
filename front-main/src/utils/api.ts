import { ApiResponse, Season, Question, QualifiedUser, QuizResult } from '../types';
import apiClient from './apiClient'; // Import the apiClient

// Re-export the ApiResponse type for consistency
export type { ApiResponse };

// Extend Window interface to include onAuthError
declare global {
  interface Window {
    onAuthError?: () => void;
  }
}

interface AuthResponse {
  token: string;
  refreshToken: string;
}

// Token storage using localStorage for persistence
// This should match the token storage in apiClient.ts
class TokenManager {
  private static readonly TOKEN_KEY = 'token';
  private static readonly REFRESH_TOKEN_KEY = 'refresh_token';

  static setTokens(token: string, refreshToken: string) {
    try {
      localStorage.setItem(this.TOKEN_KEY, token);
      localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
    } catch (error) {
      console.error('Error saving tokens to localStorage:', error);
    }
  }

  static getToken(): string | null {
    try {
      return localStorage.getItem(this.TOKEN_KEY);
    } catch (error) {
      console.error('Error getting token from localStorage:', error);
      return null;
    }
  }

  static getRefreshToken(): string | null {
    try {
      return localStorage.getItem(this.REFRESH_TOKEN_KEY);
    } catch (error) {
      console.error('Error getting refresh token from localStorage:', error);
      return null;
    }
  }

  static clearTokens() {
    try {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    } catch (error) {
      console.error('Error clearing tokens from localStorage:', error);
    }
  }
}

// Use the apiClient for all API calls
// It handles request/response interception and token management
const api = {
  get: apiClient.get,
  post: apiClient.post,
  put: apiClient.put,
  delete: apiClient.delete
};

// Helper function to ensure consistent response format
const formatResponse = <T>(data: T, status = 200, statusText = 'OK'): ApiResponse<T> => {
  return {
    data,
    success: true,
    status,
    statusText,
    headers: {},
    config: {}
  } as ApiResponse<T>;
};

// Helper function to format error response
const formatError = <T>(error: any, defaultMessage = 'An error occurred'): ApiResponse<T> => {
  const message = error.message || defaultMessage;
  const status = error.status || 500;
  const statusText = error.statusText || 'Error';
  
  return {
    data: {} as T,
    success: false,
    error: message,
    status,
    statusText,
    headers: error.headers || {},
    config: error.config || {}
  } as ApiResponse<T>;
};

// Auth API
export async function login(email: string, password: string): Promise<ApiResponse<AuthResponse>> {
  try {
    const response = await api.post<AuthResponse>('/auth/login', { email, password });
    TokenManager.setTokens(response.token, response.refreshToken);
    return formatResponse(response);
  } catch (error: any) {
    console.error('Login error:', error);
    return formatError<AuthResponse>(error, 'Failed to login');
  }
}

export async function register(userData: {
  username: string;
  email: string;
  password: string;
  phone: string;
  amount: number;
}): Promise<ApiResponse<AuthResponse>> {
  try {
    const response = await api.post('/auth/register', userData);
    const authData = response.data as AuthResponse;
    
    // Store tokens in memory
    TokenManager.setTokens(authData.token, authData.refreshToken);
    
    return {
      data: authData,
      success: true
    };
  } catch (error) {
    throw error;
  }
}

export async function refreshToken(refreshToken: string): Promise<ApiResponse<AuthResponse>> {
  try {
    const response = await api.post<AuthResponse>('/auth/refresh-token', { refreshToken });
    TokenManager.setTokens(response.token, response.refreshToken);
    return formatResponse(response);
  } catch (error: any) {
    console.error('Token refresh failed:', error);
    // Clear tokens on refresh failure
    TokenManager.clearTokens();
    // Notify any auth error handlers
    if (typeof window.onAuthError === 'function') {
      window.onAuthError();
    }
    throw error;
  }
}

export function logout() {
  TokenManager.clearTokens();
}

// Season API - Enhanced with better error handling
export async function fetchAllSeasons(): Promise<ApiResponse<Season[]>> {
  try {
    const response = await api.get('/admin/seasons');
    return {
      data: response.data as Season[],
      success: true
    };
  } catch (error) {
    console.error('Error fetching seasons:', error);
    throw error;
  }
}

export async function fetchSeason(id: number): Promise<ApiResponse<Season>> {
  try {
    const response = await api.get(`/admin/seasons/${id}`);
    return {
      data: response.data as Season,
      success: true
    };
  } catch (error) {
    console.error(`Error fetching season ${id}:`, error);
    throw error;
  }
}

// Type for creating a new season (only requires essential fields)
type SeasonCreateData = {
  name: string;
  start_date: string;
  end_date: string;
  is_active?: boolean;
  is_qualification_round?: boolean;
  minimum_score_percentage?: number;
  description?: string;
};

export async function createSeason(season: SeasonCreateData): Promise<ApiResponse<Season>> {
  try {
    // Ensure required fields are present
    if (!season.name || !season.start_date || !season.end_date) {
      throw { message: 'Missing required season fields', status: 400 };
    }

    // Validate dates
    const startDate = new Date(season.start_date);
    const endDate = new Date(season.end_date);
    
    if (startDate >= endDate) {
      throw { message: 'End date must be after start date', status: 400 };
    }

    // Prepare the payload with default values for optional fields
    const payload = {
      name: season.name,
      description: season.description || '',
      start_date: season.start_date,
      end_date: season.end_date,
      is_active: season.is_active ?? false,
      is_qualification_round: season.is_qualification_round ?? false,
      minimum_score_percentage: season.minimum_score_percentage || 0,
    };

    console.log('Creating season with payload:', payload);
    
    // Use the apiClient for the request
    const response = await api.post<Season>('/admin/seasons', payload);
    console.log('Season created successfully:', response);
    
    return formatResponse(response, 201, 'Created');
  } catch (error: any) {
    console.error('Error creating season:', error);
    return formatError<Season>(error, 'Failed to create season');
  }
}

export async function updateSeason(id: number | string, season: Partial<SeasonCreateData>): Promise<ApiResponse<Season>> {
  try {
    // Validate dates if both are provided
    if (season.start_date && season.end_date && new Date(season.start_date) >= new Date(season.end_date)) {
      throw new Error('End date must be after start date');
    }

    // Only include fields that are provided and not undefined
    const payload: Record<string, any> = {};
    if (season.name !== undefined) payload.name = season.name.trim();
    if (season.start_date !== undefined) payload.start_date = season.start_date;
    if (season.end_date !== undefined) payload.end_date = season.end_date;
    if (season.is_active !== undefined) payload.is_active = season.is_active;
    if (season.is_qualification_round !== undefined) payload.is_qualification_round = season.is_qualification_round;
    if (season.minimum_score_percentage !== undefined) payload.minimum_score_percentage = season.minimum_score_percentage;
    if (season.description !== undefined) payload.description = season.description;

    console.log(`Sending request to /admin/seasons/${id} with data:`, JSON.stringify(payload, null, 2));
    
    // Use the apiClient for consistent API handling
    const response = await apiClient.put<Season>(`/admin/seasons/${id}`, payload);
    // The apiClient already extracts the data property, so we can use it directly
    return { 
      data: response as Season,
      success: true 
    };
  } catch (error: any) {
    console.error(`Error updating season ${id}:`, error);
    throw new Error(error.message || 'Failed to update season');
  }
}

export async function deleteSeason(id: number | string): Promise<ApiResponse<void>> {
  try {
    await api.delete(`/admin/seasons/${id}`);
    return {
      data: undefined,
      success: true
    };
  } catch (error) {
    console.error(`Error deleting season ${id}:`, error);
    throw error;
  }
}

export async function fetchSeasonQuestions(id: number): Promise<ApiResponse<Question[]>> {
  try {
    const response = await api.get(`/admin/seasons/${id}/questions`);
    return {
      data: response.data as Question[],
      success: true
    };
  } catch (error) {
    console.error(`Error fetching questions for season ${id}:`, error);
    throw error;
  }
}

export async function addSeasonQuestions(id: number, questions: Question[]): Promise<ApiResponse<void>> {
  try {
    // Validate questions before sending
    for (const question of questions) {
      if (!question.question_text?.trim()) {
        throw new Error('Question text is required for all questions');
      }
      if (!question.options || question.options.length < 2) {
        throw new Error('At least 2 options are required for each question');
      }
      if (question.options.some(opt => !opt?.trim())) {
        throw new Error('All options must have text');
      }
      if (!question.correct_answer?.trim()) {
        throw new Error('Correct answer is required for all questions');
      }
      if (!question.options.includes(question.correct_answer)) {
        throw new Error('Correct answer must match one of the provided options');
      }
    }

    await api.post(`/admin/seasons/${id}/questions`, { questions });
    return {
      data: undefined,
      success: true
    };
  } catch (error) {
    console.error(`Error adding questions to season ${id}:`, error);
    throw error;
  }
}

export async function removeSeasonQuestion(seasonId: number, questionId: number): Promise<ApiResponse<void>> {
  try {
    await api.delete(`/admin/seasons/${seasonId}/questions/${questionId}`);
    return {
      data: undefined,
      success: true
    };
  } catch (error) {
    console.error(`Error removing question ${questionId} from season ${seasonId}:`, error);
    throw error;
  }
}

export async function fetchQualifiedUsers(seasonId: number): Promise<ApiResponse<QualifiedUser[]>> {
  try {
    const response = await api.get(`/admin/seasons/${seasonId}/qualified-users`);
    return {
      data: response.data as QualifiedUser[],
      success: true
    };
  } catch (error) {
    console.error(`Error fetching qualified users for season ${seasonId}:`, error);
    throw error;
  }
}

// Question API
export async function fetchAllQuestions(): Promise<ApiResponse<Question[]>> {
  try {
    const response = await api.get('/admin/questions');
    return {
      data: response.data as Question[],
      success: true
    };
  } catch (error) {
    console.error('Error fetching all questions:', error);
    throw error;
  }
}

export async function createQuestion(question: Question): Promise<ApiResponse<Question>> {
  try {
    const response = await api.post('/admin/questions', question);
    return {
      data: response.data as Question,
      success: true
    };
  } catch (error) {
    console.error('Error creating question:', error);
    throw error;
  }
}

export async function updateQuestion(id: number, question: Partial<Question>): Promise<ApiResponse<Question>> {
  try {
    const response = await api.put(`/admin/questions/${id}`, question);
    return {
      data: response.data as Question,
      success: true
    };
  } catch (error) {
    console.error(`Error updating question ${id}:`, error);
    throw error;
  }
}

export async function deleteQuestion(id: number): Promise<ApiResponse<void>> {
  try {
    await api.delete(`/admin/questions/${id}`);
    return {
      data: undefined,
      success: true
    };
  } catch (error) {
    console.error(`Error deleting question ${id}:`, error);
    throw error;
  }
}

// Results API
export async function fetchResults(userId: number, seasonId: number): Promise<ApiResponse<QuizResult[]>> {
  try {
    const response = await api.get(`/results/user/${userId}/season/${seasonId}`);
    return {
      data: response.data as QuizResult[],
      success: true
    };
  } catch (error) {
    console.error(`Error fetching results for user ${userId}, season ${seasonId}:`, error);
    throw error;
  }
}

export async function fetchCurrentSeason(): Promise<ApiResponse<Season>> {
  try {
    const response = await api.get('/current');
    return {
      data: response.data as Season,
      success: true
    };
  } catch (error) {
    console.error('Error fetching current season:', error);
    throw error;
  }
}

export async function saveProgress(userId: number, score: number, total: number): Promise<ApiResponse<void>> {
  try {
    await api.post('/progress', { userId, score, total });
    return {
      data: undefined,
      success: true
    };
  } catch (error) {
    console.error('Error saving progress:', error);
    throw error;
  }
}

export async function fetchQuestions(): Promise<ApiResponse<{ questions: Question[] }>> {
  try {
    const response = await api.get('/questions');
    return {
      data: response.data as { questions: Question[] },
      success: true
    };
  } catch (error) {
    console.error('Error fetching questions:', error);
    throw error;
  }
}

// Export the TokenManager for external access if needed
export { TokenManager };

// Export the api instance as default
export default api;