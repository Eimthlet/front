// Re-export all API functions and types from the utils/api file
import api, { 
  TokenManager,
  login,
  register,
  refreshToken,
  logout,
  fetchAllSeasons,
  fetchSeason,
  createSeason,
  updateSeason,
  deleteSeason,
  fetchSeasonQuestions,
  addSeasonQuestions,
  removeSeasonQuestion,
  fetchQualifiedUsers,
  fetchAllQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  fetchResults,
  getCurrentSeason,
  saveProgress,
  fetchQuestions
} from '../utils/api';

import { 
  ApiResponse, 
  ApiError, 
  Season, 
  Question, 
  QualifiedUser, 
  QuizResult 
} from '../types';

// Re-export types
export type { 
  ApiResponse, 
  ApiError, 
  Season, 
  Question, 
  QualifiedUser, 
  QuizResult 
};

// Re-export TokenManager and all API functions
export { 
  TokenManager,
  login,
  register,
  refreshToken,
  logout,
  fetchAllSeasons,
  fetchSeason,
  createSeason,
  updateSeason,
  deleteSeason,
  fetchSeasonQuestions,
  addSeasonQuestions,
  removeSeasonQuestion,
  fetchQualifiedUsers,
  fetchAllQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  fetchResults,
  getCurrentSeason as fetchCurrentSeason,
  saveProgress,
  fetchQuestions
};

// Export the default api instance
export default api;

// This file serves as a central export point for all API-related functionality.
// Components should import from this file instead of directly from utils/api.
//
// Example usage:
// import api, { TokenManager, createSeason, type ApiResponse } from '../api';
//
// This pattern makes it easier to refactor the API implementation in the future.
