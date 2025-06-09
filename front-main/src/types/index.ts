// Auth response type for authentication endpoints
export interface AuthResponse {
  token: string;
  refreshToken: string;
  user?: {
    id: number;
    username: string;
    email: string;
  };
}

// Axios response type for API calls
export interface AxiosResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, any>;
  config: {
    url?: string;
    method?: string;
    [key: string]: any;
  };
}

// Base response type for all API responses
export interface ApiResponse<T = any> {
  data: T;
  success: boolean;
  error?: string;
  message?: string;
  status: number;
  statusText: string;
  headers: Record<string, any>;
  config: {
    url?: string;
    method?: string;
    [key: string]: any;
  };
  [key: string]: any; // Allow additional properties
}

export interface ApiError {
  message: string;
  response?: {
    status: number;
    data?: {
      message?: string;
      error?: string;
      [key: string]: any;
    };
  };
  config?: {
    url?: string;
    method?: string;
    data?: unknown;
    [key: string]: any;
  };
}

export interface Season {
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

export interface Question {
  id: number;
  question_text: string;
  question?: string; // Alias for question_text
  options: string[];
  correct_answer: string;
  correctAnswer?: string; // Alias for correct_answer
  category: string;
  difficulty: string;
  time_limit?: number;
  season_id?: number | null;
  created_at?: string;
  updated_at?: string;
}

// Type for creating a new question
export interface QuestionCreateData {
  question_text: string;
  options: string[];
  correct_answer: string;
  category: string;
  difficulty: string;
  time_limit?: number;
  season_id?: number | null;
}

export interface User {
  id: number;
  username: string;
  email: string;
  created_at?: string;
  updated_at?: string;
}

export interface QualifiedUser {
  id: number;
  username: string;
  email: string;
  score: number;
  percentage_score: number;
  completed_at: string;
}

export interface QuizResult {
  id: number;
  user_id: number;
  season_id: number;
  round_id: number;
  score: number;
  completed_at: string;
  round_number: number;
  min_score_to_qualify: number;
}
