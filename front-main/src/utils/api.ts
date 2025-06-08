import axios from 'axios';
import { API_CONFIG } from '../config';
import { ApiResponse, Season, Question, QualifiedUser, QuizResult } from '../types';

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

// Memory-based token storage (replaces localStorage)
class TokenManager {
  private static token: string | null = null;
  private static refreshToken: string | null = null;

  static setTokens(token: string, refreshToken: string) {
    this.token = token;
    this.refreshToken = refreshToken;
  }

  static getToken(): string | null {
    return this.token;
  }

  static getRefreshToken(): string | null {
    return this.refreshToken;
  }

  static clearTokens() {
    this.token = null;
    this.refreshToken = null;
  }
}

// Create axios instance with default config
export const api = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: API_CONFIG.WITH_CREDENTIALS
});

// Request interceptor for authentication
api.interceptors.request.use(
  (config) => {
    const token = TokenManager.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Handle 401 Unauthorized (token expired)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = TokenManager.getRefreshToken();
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }
        
        const refreshResponse = await api.post<AuthResponse>('/auth/refresh', { refreshToken });
        TokenManager.setTokens(
          refreshResponse.data.token, 
          refreshResponse.data.refreshToken
        );
        
        // Retry the original request
        return api(originalRequest);
      } catch (refreshError) {
        console.error('Refresh token failed:', refreshError);
        // Clear tokens and handle logout
        TokenManager.clearTokens();
        // Instead of redirecting, emit an event or call a callback
        const onAuthError = (window as any).onAuthError;
        if (onAuthError) {
          onAuthError();
        }
        return Promise.reject(refreshError);
      }
    }
    
    // Handle other errors
    if (error.response) {
      const errorData = error.response.data;
      throw new Error(errorData.error || errorData.message || 'API request failed');
    }
    
    throw error;
  }
);

// Auth API
export async function login(email: string, password: string): Promise<ApiResponse<AuthResponse>> {
  try {
    const response = await api.post('/auth/login', { email, password });
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
    const response = await api.post('/auth/refresh', { refreshToken });
    const authData = response.data as AuthResponse;
    
    // Update stored tokens
    TokenManager.setTokens(authData.token, authData.refreshToken);
    
    return {
      data: authData,
      success: true
    };
  } catch (error) {
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

export async function createSeason(season: Omit<Season, 'id'>): Promise<ApiResponse<Season>> {
  try {
    // Validate season data before sending
    if (!season.name?.trim()) {
      throw new Error('Season name is required');
    }
    if (!season.start_date || !season.end_date) {
      throw new Error('Start date and end date are required');
    }
    if (new Date(season.start_date) >= new Date(season.end_date)) {
      throw new Error('End date must be after start date');
    }

    const response = await api.post('/admin/seasons', season);
    return {
      data: response.data as Season,
      success: true
    };
  } catch (error) {
    console.error('Error creating season:', error);
    throw error;
  }
}

export async function updateSeason(id: number | string, season: Partial<Season>): Promise<ApiResponse<Season>> {
  try {
    // Validate season data if dates are provided
    if (season.start_date && season.end_date) {
      if (new Date(season.start_date) >= new Date(season.end_date)) {
        throw new Error('End date must be after start date');
      }
    }

    const response = await api.put(`/admin/seasons/${id}`, season);
    return {
      data: response.data as Season,
      success: true
    };
  } catch (error) {
    console.error(`Error updating season ${id}:`, error);
    throw error;
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