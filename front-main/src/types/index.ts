export interface ApiResponse<T = any> {
  data: T;
  success: boolean;
  error?: string;
  status: number;
  statusText: string;
  headers?: any;
  config?: any;
}

export interface ApiError {
  response?: {
    status: number;
    data: {
      message?: string;
      error?: string;
    };
  };
  message: string;
  config?: {
    url?: string;
    method?: string;
    data?: unknown;
  };
}

export interface Season {
  id?: string | number;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  is_qualification_round: boolean;
  minimum_score_percentage: number;
  description?: string;
  question_count: number;
  attempts_count: number;
  qualified_users_count: number;
  created_at: string;
  updated_at: string;
}

export interface Question {
  id?: number;
  question_text: string;
  options: string[];
  correct_answer: string;
  category?: string;
  difficulty?: string;
}

export interface QualifiedUser {
  id: number;
  username: string;
  email: string;
  score: number;
  percentage_score: number;
  completed_at: string;
}
