import { 
  Season, 
  Question, 
  QualifiedUser, 
  QuizResult
} from '../types';

type QuestionCreateData = Omit<Question, 'id'>;
import apiClient from './apiClient';
import type { ApiResponse } from './apiClient';
import TokenManager from './TokenManager';

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

// TokenManager is now imported from TokenManager.ts

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
  };
};

// Helper function to format error response
const formatError = <T>(
  error: any, 
  defaultMessage = 'An error occurred',
  statusCode: number = 500,
  statusText: string = 'Error'
): ApiResponse<T> => {
  const message = error.message || defaultMessage;
  const status = error.status || statusCode;
  const errorStatusText = error.statusText || statusText;
  
  return {
    data: {} as T,
    success: false,
    error: message,
    status,
    statusText: errorStatusText,
    headers: error.headers || {},
    config: error.config || {}
  };
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
    
    return formatResponse(authData, 200, 'Success');
  } catch (error) {
    return formatError(error, 'Registration failed');
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
    const response = await api.get<Season[]>('/admin/seasons');
    return formatResponse(response, 200, 'Success');
  } catch (error) {
    return formatError(error, 'Failed to fetch seasons');
  }
}

export async function fetchSeason(id: number): Promise<ApiResponse<Season>> {
  try {
    const response = await api.get<Season>(`/admin/seasons/${id}`);
    return formatResponse(response, 200, 'Success');
  } catch (error) {
    return formatError(error, `Failed to fetch season ${id}`);
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
    // Validate required fields
    if (!season.name || !season.start_date || !season.end_date) {
      return formatError({ message: 'Missing required fields' }, 'Validation failed', 400);
    }

    // Convert dates to ISO string if they're Date objects
    const payload = {
      ...season,
      start_date: new Date(season.start_date).toISOString(),
      end_date: new Date(season.end_date).toISOString(),
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
    // Ensure required fields are present
    if (!season.name && !season.start_date && !season.end_date) {
      return formatError(
        { message: 'At least one field must be provided for update' },
        'Validation failed',
        400
      );
    }

    // Prepare the payload with only the fields that are provided
    const payload: any = {};
    if (season.name) payload.name = season.name;
    if (season.description) payload.description = season.description;
    if (season.start_date) payload.start_date = new Date(season.start_date).toISOString();
    if (season.end_date) payload.end_date = new Date(season.end_date).toISOString();
    if (season.is_active !== undefined) payload.is_active = season.is_active;
    if (season.is_qualification_round !== undefined) payload.is_qualification_round = season.is_qualification_round;
    if (season.minimum_score_percentage !== undefined) payload.minimum_score_percentage = season.minimum_score_percentage;

    console.log('Updating season with payload:', payload);
    const response = await api.put<Season>(`/admin/seasons/${id}`, payload);
    
    // Return the updated season with success status
    return formatResponse(response, 200, 'Season updated successfully');
  } catch (error) {
    console.error(`Error updating season ${id}:`, error);
    return formatError(error, `Failed to update season ${id}`);
  }
}

export async function deleteSeason(id: number | string): Promise<ApiResponse<void>> {
  try {
    const response = await api.delete(`/admin/seasons/${id}`);
    return formatResponse(response, 204, 'Season deleted successfully');
  } catch (error) {
    console.error(`Error deleting season ${id}:`, error);
    return formatError(error, `Failed to delete season ${id}`);
  }
}

export async function fetchSeasonQuestions(seasonId: number | string): Promise<ApiResponse<Question[]>> {
  try {
    const response = await api.get<Question[]>(`/admin/seasons/${seasonId}/questions`);
    return formatResponse(response, 200, 'Questions fetched successfully');
  } catch (error) {
    console.error(`Error fetching questions for season ${seasonId}:`, error);
    return formatError(error, `Failed to fetch questions for season ${seasonId}`);
  }
}

export async function addSeasonQuestions(id: number, questions: Question[]): Promise<ApiResponse<void>> {
  try {
    // Validate questions before sending
    for (const question of questions) {
      if (!question.question_text?.trim()) {
        return formatError(
          { message: 'Question text is required for all questions' },
          'Validation failed',
          400
        );
      }
      if (!question.options || question.options.length < 2) {
        return formatError(
          { message: 'At least 2 options are required for each question' },
          'Validation failed',
          400
        );
      }
      if (question.options.some(opt => !opt?.trim())) {
        return formatError(
          { message: 'All options must have text' },
          'Validation failed',
          400
        );
      }
      if (!question.correct_answer?.trim()) {
        return formatError(
          { message: 'Correct answer is required for all questions' },
          'Validation failed',
          400
        );
      }
      if (!question.options.includes(question.correct_answer)) {
        return formatError(
          { message: 'Correct answer must match one of the provided options' },
          'Validation failed',
          400
        );
      }
    }

    const response = await api.post(`/admin/seasons/${id}/questions`, { questions });
    return formatResponse(response, 201, 'Questions added successfully');
  } catch (error) {
    console.error(`Error adding questions to season ${id}:`, error);
    return formatError(error, `Failed to add questions to season ${id}`);
  }
}

export async function removeSeasonQuestion(seasonId: number, questionId: number): Promise<ApiResponse<void>> {
  try {
    const response = await api.delete(`/admin/seasons/${seasonId}/questions/${questionId}`);
    return formatResponse(response, 204, 'Question removed successfully');
  } catch (error) {
    console.error(`Error removing question ${questionId} from season ${seasonId}:`, error);
    return formatError(error, `Failed to remove question ${questionId} from season ${seasonId}`);
  }
}

export async function fetchQualifiedUsers(seasonId: number): Promise<ApiResponse<QualifiedUser[]>> {
  try {
    const response = await api.get<QualifiedUser[]>(`/admin/seasons/${seasonId}/qualified-users`);
    return formatResponse(response, 200, 'Qualified users fetched successfully');
  } catch (error) {
    console.error(`Error fetching qualified users for season ${seasonId}:`, error);
    return formatError(error, `Failed to fetch qualified users for season ${seasonId}`);
  }
}

export async function updateQualifiedUser(
  seasonId: number,
  userId: number,
  updates: Partial<QualifiedUser>
): Promise<ApiResponse<QualifiedUser>> {
  try {
    const response = await api.put<QualifiedUser>(
      `/admin/seasons/${seasonId}/qualified-users/${userId}`,
      updates
    );
    return formatResponse(response, 200, 'Qualified user updated successfully');
  } catch (error) {
    console.error(`Error updating qualified user ${userId} for season ${seasonId}:`, error);
    return formatError(error, `Failed to update qualified user ${userId} for season ${seasonId}`);
  }
}

// Question API
export async function fetchAllQuestions(): Promise<ApiResponse<Question[]>> {
  try {
    const response = await api.get<Question[]>('/admin/questions');
    return formatResponse(response, 200, 'Questions fetched successfully');
  } catch (error) {
    console.error('Error fetching questions:', error);
    return formatError(error, 'Failed to fetch questions');
  }
}

export async function fetchQuestions(): Promise<ApiResponse<{ questions: Question[] }>> {
  try {
    const response = await api.get<{ questions: Question[] }>('/questions');
    return formatResponse(response, 200, 'Questions fetched successfully');
  } catch (error) {
    console.error('Error fetching questions:', error);
    return formatError(error, 'Failed to fetch questions');
  }
}

export async function createQuestion(question: QuestionCreateData): Promise<ApiResponse<Question>> {
  try {
    const response = await api.post<Question>('/admin/questions', question);
    return formatResponse(response, 201, 'Question created successfully');
  } catch (error) {
    console.error('Error creating question:', error);
    return formatError(error, 'Failed to create question');
  }
}

export async function updateQuestion(id: number, question: Partial<Question>): Promise<ApiResponse<Question>> {
  try {
    const response = await api.put<Question>(`/admin/questions/${id}`, question);
    return formatResponse(response, 200, 'Question updated successfully');
  } catch (error) {
    console.error(`Error updating question ${id}:`, error);
    return formatError(error, `Failed to update question ${id}`);
  }
}

export async function deleteQuestion(id: number): Promise<ApiResponse<void>> {
  try {
    const response = await api.delete(`/admin/questions/${id}`);
    return formatResponse(response, 204, 'Question deleted successfully');
  } catch (error) {
    console.error(`Error deleting question ${id}:`, error);
    return formatError(error, `Failed to delete question ${id}`);
  }
}

// Results API
export async function fetchQuizResults(seasonId: number): Promise<ApiResponse<QuizResult[]>> {
  try {
    const response = await api.get<QuizResult[]>(`/admin/seasons/${seasonId}/results`);
    return formatResponse(response, 200, 'Quiz results fetched successfully');
  } catch (error) {
    console.error(`Error fetching quiz results for season ${seasonId}:`, error);
    return formatError(error, `Failed to fetch quiz results for season ${seasonId}`);
  }
}

export async function fetchResults(userId: number, seasonId: number): Promise<ApiResponse<QuizResult[]>> {
  try {
    const response = await api.get(`/results/user/${userId}/season/${seasonId}`);
    return formatResponse(response, 200, 'Results fetched successfully');
  } catch (error) {
    console.error(`Error fetching results for user ${userId}, season ${seasonId}:`, error);
    return formatError(error, `Failed to fetch results for user ${userId}, season ${seasonId}`);
  }
}

export async function getCurrentSeason(): Promise<ApiResponse<Season>> {
  try {
    const response = await api.get<Season>('/current');
    return formatResponse(response, 200, 'Current season fetched successfully');
  } catch (error) {
    console.error('Error fetching current season:', error);
    return formatError(error, 'Failed to fetch current season');
  }
}

export async function saveProgress(userId: number, score: number, total: number): Promise<ApiResponse<void>> {
  try {
    const response = await api.post('/progress', { userId, score, total });
    return formatResponse(response, 201, 'Progress saved successfully');
  } catch (error) {
    console.error('Error saving progress:', error);
    return formatError(error, 'Failed to save progress');
  }
}

// Export the TokenManager
export { TokenManager };

// Export the api instance as default
export default api;