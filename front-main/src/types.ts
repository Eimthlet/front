export interface Season {
  id: number;
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
  options: string[];
  correct_answer: string;
  category: string;
  difficulty: string;
  time_limit: number;
  season_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  created_at: string;
  updated_at: string;
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

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  error?: string;
  message?: string;
}

export interface ApiError {
  message: string;
  response?: {
    data?: any;
    status?: number;
  };
  config?: {
    url?: string;
    method?: string;
  };
}
