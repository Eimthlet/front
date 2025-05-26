export interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation?: string;
  category?: string;
  difficulty?: string;
  timeLimit?: number; // in seconds
}

export interface User {
  id: string;
  username: string;
  isAdmin: boolean;
}

export interface QuizState {
  currentQuestion: number;
  score: number;
  answers: Record<string, string>;
  timeRemaining: number;
  isComplete: boolean;
}
