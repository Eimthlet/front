import apiClient from './apiClient';
import TokenManager from './TokenManager';

// Define domain types
interface Season {
  id: number | string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  is_active: boolean;
  is_qualification_round: boolean;
  minimum_score_percentage: number;
  question_count: number;
  attempts_count: number;
  qualified_users_count: number;
  created_at: string;
  updated_at: string;
}

interface Question {
  id: number;
  question_text: string;
  question?: string;
  options: string[];
  correct_answer: string;
  correctAnswer?: string;
  category: string;
  difficulty: string;
  time_limit?: number;
  season_id?: number | null;
  created_at?: string;
  updated_at?: string;
}

interface QuestionCreateData {
  question_text: string;
  options: string[];
  correct_answer: string;
  category: string;
  difficulty: string;
  time_limit?: number;
  season_id?: number | null;
}

interface QualifiedUser {
  id: number;
  username: string;
  email: string;
  score: number;
  percentage_score: number;
  completed_at: string;
}

// Extend Window interface to include onAuthError
declare global {
  interface Window {
    onAuthError?: () => void;
  }
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
function formatResponse(
  data: any, 
  status = 200, 
  statusText = 'OK',
  headers: Record<string, any> = {},
  config: Record<string, any> = {}
): any {
  return {
    data,
    success: true,
    status,
    statusText,
    headers,
    config: {
      url: '',
      method: '',
      ...config
    }
  };
}

// Helper function to format error response
function formatError(
  error: any,
  defaultMessage = 'An error occurred',
  statusCode = 500,
  statusText = 'Error',
  headers: Record<string, any> = {},
  config: Record<string, any> = {}
): any {
  return {
    data: {},
    success: false,
    error: error?.message || defaultMessage,
    message: error?.message || defaultMessage,
    status: error?.status || statusCode,
    statusText: error?.statusText || statusText,
    headers: error?.headers || headers,
    config: {
      url: '',
      method: '',
      ...(error?.config || config)
    }
  };
}

// Auth API
export async function login(email: string, password: string) {
  try {
    const response = await api.post('/auth/login', { email, password });
    
    // Save tokens to TokenManager
    TokenManager.setTokens(response.data.token, response.data.refreshToken);
    
    return formatResponse(
      response.data,
      response.status,
      response.statusText,
      response.headers,
      response.config
    );
  } catch (error) {
    return formatError(error, 'Login failed');
  }
}

export async function register(userData: {
  username: string;
  email: string;
  password: string;
  phone: string;
  amount: number;
}) {
  try {
    const response = await api.post('/auth/register', userData);
    
    // Save tokens to TokenManager on successful registration
    if (response.data?.token && response.data?.refreshToken) {
      TokenManager.setTokens(response.data.token, response.data.refreshToken);
    }
    
    return formatResponse(
      response.data,
      response.status,
      response.statusText,
      response.headers,
      response.config
    );
  } catch (error) {
    console.error('Registration error:', error);
    return formatError(error, 'Registration failed');
  }
}

export async function refreshToken(refreshToken: string) {
  try {
    const response = await api.post('/auth/refresh', { refreshToken });
    
    // Save new tokens
    if (response.data?.token && response.data?.refreshToken) {
      TokenManager.setTokens(response.data.token, response.data.refreshToken);
    }
    
    return formatResponse(
      response.data,
      response.status,
      response.statusText,
      response.headers,
      response.config
    );
  } catch (error) {
    console.error('Token refresh failed:', error);
    return formatError(error, 'Token refresh failed');
  }
}

export async function logout() {
  try {
    // Clear tokens from storage
    TokenManager.clearTokens();
    
    // Optional: Call the server to invalidate the token
    await api.post('/auth/logout');
    
    return formatResponse(
      { success: true },
      200,
      'Logged out successfully'
    ) as ApiResponse<{ success: boolean }>;
  } catch (error: any) {
    // Even if the server logout fails, we still want to clear local tokens
    TokenManager.clearTokens();
    return formatError(error, 'Logout failed') as ApiResponse<{ success: boolean }>;
  }
}

// Season API - Enhanced with better error handling
export async function fetchAllSeasons() {
  try {
    const response = await api.get('/seasons');
    return formatResponse(
      response.data,
      response.status,
      response.statusText,
      response.headers,
      response.config
    );
  } catch (error: any) {
    console.error('Error fetching seasons:', error);
    return formatError(error, 'Failed to fetch seasons') as ApiResponse<Season[]>;
  }
}

export async function fetchSeason(id: number) {
  try {
    const response = await api.get(`/seasons/${id}`);
    return formatResponse(
      response.data,
      response.status,
      response.statusText,
      response.headers,
      response.config
    );
  } catch (error: any) {
    console.error(`Error fetching season with id ${id}:`, error);
    return formatError(error, `Failed to fetch season with id ${id}`) as ApiResponse<Season>;
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

export async function createSeason(season: SeasonCreateData) {
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
    const response = await api.post('/admin/seasons', payload);
    console.log('Season created successfully:', response);
    
    return formatResponse(
      response.data,
      response.status,
      response.statusText,
      response.headers,
      response.config
    );
  } catch (error) {
    console.error('Error creating season:', error);
    return formatError(error, 'Failed to create season');
  }
}

export async function updateSeason(id: number | string, season: Partial<SeasonCreateData>) {
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
    const response = await api.put(`/admin/seasons/${id}`, payload);
    
    // Return the updated season with success status
    return formatResponse(
      response.data,
      response.status,
      response.statusText,
      response.headers,
      response.config
    );
  } catch (error) {
    console.error(`Error updating season ${id}:`, error);
    return formatError(error, `Failed to update season ${id}`);
  }
}

export async function deleteSeason(id: number | string) {
  try {
    const response = await api.delete(`/admin/seasons/${id}`);
    return formatResponse(
      response.data,
      response.status,
      response.statusText,
      response.headers,
      response.config
    );
  } catch (error) {
    console.error(`Error deleting season ${id}:`, error);
    return formatError(error, `Failed to delete season ${id}`);
  }
}

export async function fetchSeasonQuestions(seasonId: number | string) {
  try {
    const response = await api.get(`/admin/seasons/${seasonId}/questions`);
    return formatResponse(
      response.data,
      response.status,
      response.statusText,
      response.headers,
      response.config
    );
  } catch (error) {
    console.error(`Error fetching questions for season ${seasonId}:`, error);
    return formatError(error, `Failed to fetch questions for season ${seasonId}`);
  }
}

export async function addSeasonQuestions(id: number, questions: Question[]) {
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

export async function removeSeasonQuestion(seasonId: number, questionId: number) {
  try {
    const response = await api.delete(`/admin/seasons/${seasonId}/questions/${questionId}`);
    return formatResponse(response, 204, 'Question removed successfully');
  } catch (error) {
    console.error(`Error removing question ${questionId} from season ${seasonId}:`, error);
    return formatError(error, `Failed to remove question ${questionId} from season ${seasonId}`);
  }
}

export async function fetchQualifiedUsers(seasonId: number) {
  try {
    const response = await api.get(`/admin/seasons/${seasonId}/qualified-users`);
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
) {
  try {
    const response = await api.put(
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
export async function fetchAllQuestions() {
  try {
    const response = await api.get('/questions');
    return formatResponse(response, 200, 'Questions fetched successfully');
  } catch (error: any) {
    console.error('Error fetching questions:', error);
    return formatError(error, 'Failed to fetch questions');
  }
}

export async function fetchQuestions() {
  try {
    const response = await api.get('/questions');
    return formatResponse(response, 200, 'Questions fetched successfully');
  } catch (error: any) {
    console.error('Error fetching questions:', error);
    return formatError(error, 'Failed to fetch questions');
  }
}

export async function createQuestion(question: QuestionCreateData) {
  try {
    const response = await api.post('/questions', question);
    return formatResponse(
      response.data,
      response.status,
      response.statusText,
      response.headers,
      response.config
    );
  } catch (error) {
    console.error('Error creating question:', error);
    return formatError(error, 'Failed to create question');
  }
}

export async function updateQuestion(id: number, question: Partial<Question>) {
  try {
    const response = await api.put(`/questions/${id}`, question);
    return formatResponse(
      response.data,
      response.status,
      response.statusText,
      response.headers,
      response.config
    );
  } catch (error) {
    console.error(`Error updating question with id ${id}:`, error);
    return formatError(error, `Failed to update question with id ${id}`);
  }
}

export async function deleteQuestion(id: number) {
  try {
    const response = await api.delete(`/questions/${id}`);
    return formatResponse(
      response.data,
      response.status,
      response.statusText,
      response.headers,
      response.config
    );
  } catch (error) {
    console.error(`Error deleting question with id ${id}:`, error);
    return formatError(error, `Failed to delete question with id ${id}`);
  }
}

export async function fetchResults(userId: number, seasonId: number) {
  try {
    const response = await api.get(`/results/user/${userId}/season/${seasonId}`);
    return formatResponse(response, 200, 'Results fetched successfully');
  } catch (error: any) {
    console.error(`Error fetching results for user ${userId}, season ${seasonId}:`, error);
    return formatError(error, `Failed to fetch results for user ${userId}, season ${seasonId}`);
  }
}

export async function getCurrentSeason() {
  try {
    const response = await api.get('/seasons/active');
    return formatResponse(response, 200, 'Current season fetched successfully');
  } catch (error: any) {
    console.error('Error fetching current season:', error);
    return formatError(error, 'Failed to fetch active season');
  }
}

export async function saveProgress(userId: number, score: number, total: number) {
  try {
    const response = await api.post('/progress', { userId, score, total });
    return formatResponse(
      response.data,
      response.status,
      response.statusText,
      response.headers,
      response.config
    ) as ApiResponse<void>;
  } catch (error) {
    console.error('Error saving progress:', error);
    return formatError(error, 'Failed to save progress');
  }
}

// Quiz API
export interface QualificationStartResponse {
  success: boolean;
  attemptId?: string; // Made optional to handle error cases
  questions: Array<{
    id: string | number;
    question: string;
    options: string[];
    category: string;
    difficulty: string;
    timeLimit: number;
  }>;
  totalQuestions: number;
  minimumScorePercentage: number;
  message?: string;
}

export async function startQualificationAttempt(): Promise<QualificationStartResponse> {
  try {
    console.log('[API] Starting qualification attempt...');
    
    // Use environment variable or default to development URL
    const baseUrl = (process.env.REACT_APP_API_URL || 'http://localhost:5000').replace(/\/$/, '');
    const endpoint = '/quiz/start-qualification';
    const url = `${baseUrl}${endpoint}`;
    
    console.log(`[API] Making POST request to ${url}`);
    
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found in localStorage');
    }
    
    console.log('[API] Using token:', token ? 'Token exists' : 'No token');
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      console.log('[API] Request completed, status:', response.status);
      
      // Try to parse response as JSON, but handle non-JSON responses
      let responseData;
      try {
        responseData = await response.json();
        console.log('[API] Parsed response data:', responseData);
      } catch (parseError) {
        console.error('[API] Failed to parse response as JSON:', parseError);
        const text = await response.text();
        console.log('[API] Raw response text:', text);
        throw new Error(`Invalid response format: ${text.substring(0, 100)}`);
      }
      
      // Handle non-2xx responses
      if (!response.ok) {
        const errorMessage = responseData?.message || 
                           response.statusText || 
                           `Request failed with status ${response.status}`;
        console.error('[API] Server responded with error:', errorMessage);
        
        if (response.status === 401) {
          throw new Error('Session expired. Please log in again.');
        }
        
        if (response.status === 403) {
          throw new Error('You do not have permission to start a qualification.');
        }
        
        throw new Error(errorMessage);
      }
      
      // Handle successful response
      if (responseData && responseData.success === true) {
        const { attemptId, questions, totalQuestions, minimumScore, minimumScorePercentage } = responseData;
        
        if (!questions || !Array.isArray(questions)) {
          console.error('[API] Invalid questions data in response:', questions);
          throw new Error('Invalid questions data received from server');
        }
        
        const result = {
          success: true,
          attemptId: attemptId?.toString() || '',
          questions: questions.map((q: any) => ({
            id: q.id,
            question: q.question,
            options: q.options || [],
            category: q.category || '',
            difficulty: q.difficulty || 'medium',
            timeLimit: q.timeLimit || 30
          })),
          totalQuestions: totalQuestions || questions?.length || 0,
          minimumScorePercentage: minimumScorePercentage || minimumScore || 0
        };
        
        console.log('[API] Successfully processed qualification attempt:', result);
        return result;
      }
      
      // Handle case where success is not true
      const errorMessage = responseData?.message || 'Failed to start qualification attempt';
      console.error('[API] Server responded with success: false, message:', errorMessage);
      throw new Error(errorMessage);
      
    } catch (error: any) {
      console.error('[API] Network or API error:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
        status: error.status
      });
      
      // Handle network errors
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        throw new Error('Unable to connect to the server. Please check your internet connection.');
      }
      
      throw error; // Re-throw to be handled by outer catch
    }
    
  } catch (error: any) {
    console.error('[API] Error in startQualificationAttempt:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
    // Handle specific error cases
    if (error.message.includes('Game Already Played')) {
      throw new Error('You have already played this quiz.');
    }
    
    if (error.message.includes('Session expired')) {
      throw new Error('Session expired. Please log in again.');
    }
    
    throw new Error(error.message || 'Failed to start qualification. Please try again.');
  }
}

// Re-export TokenManager for backward compatibility
export { TokenManager };

// Export the api instance as default
export default api;