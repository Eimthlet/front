// This file is deprecated. Please use the axios-based client in src/utils/api.ts instead.
// This file is kept for backward compatibility only and will be removed in a future version.

import axios from 'axios';
import { API_CONFIG, AUTH_CONFIG } from './config';

// Always use the production URL
const API_BASE = 'https://car-quizz.onrender.com';
const API_TIMEOUT = 30000; // 30 seconds timeout

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': 'true'
  },
  xsrfCookieName: 'accessToken',
  xsrfHeaderName: 'X-CSRF-Token',
  withCredentials: true
});

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log('API Request Interceptor:', {
      url: config.url,
      method: config.method,
      tokenExists: !!localStorage.getItem('token'),
      tokenLength: localStorage.getItem('token')?.length,
      tokenFirstChars: localStorage.getItem('token')?.substring(0, 10),
      refreshTokenExists: !!localStorage.getItem('refreshToken'),
      headers: config.headers
    });
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for logging and error handling
api.interceptors.response.use(
  (response) => {
    console.log('API Response:', {
      url: response.config.url,
      method: response.config.method,
      status: response.status,
      data: response.data
    });
    return response;
  },
  (error) => {
    console.error('API Response Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data,
      error: error.message,
      errorName: error.name,
      errorMessage: error.message
    });
    return Promise.reject(error);
  }
);

export interface User {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'user';
  token: string;
}

export interface AuthResponse {
  user: {
    id: number;
    username: string;
    email: string;
    role?: string;
  };
  token: string;
  refreshToken: string;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  try {
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password }),
      credentials: 'include',
      signal: AbortSignal.timeout(API_TIMEOUT)
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || data.details || 'Login failed. Please try again.');
    }
    
    return data;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please check your internet connection.');
    }
    if (error.message) {
      throw new Error(error.message);
    }
    throw new Error('Network error. Please check your connection and try again.');
  }
}

export async function register(username: string, email: string, password: string, phone: string, amount: number): Promise<any> {
  try {
    const response = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password, phone, amount }),
      credentials: 'include'
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || data.details || 'Registration failed. Please try again.');
    }
    
    return data;
  } catch (error: any) {
    if (error.message) {
      throw new Error(error.message);
    }
    throw new Error('Network error. Please check your connection and try again.');
  }
}

export async function refreshToken(refreshToken: string): Promise<AuthResponse> {
  try {
    const response = await fetch(`${API_BASE}/api/auth/refresh-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
      credentials: 'include'
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Token refresh failed');
    }
    
    return data;
  } catch (error: any) {
    if (error.message) {
      throw new Error(error.message);
    }
    throw new Error('Network error during token refresh');
  }
}

export async function fetchAdminData(endpoint: string) {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_BASE}/api/admin/${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Admin data fetch failed');
  }

  return response.json();
}

// Question management functions
export interface Question {
  id?: string;
  question: string;
  options: string[];
  correctAnswer: string;
  timeLimit: number;
  category: string;
  difficulty: string;
}

export async function addQuestion(question: Question): Promise<Question> {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_BASE}/api/admin/questions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(question)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to add question');
  }

  return response.json();
}

export async function editQuestion(question: Question): Promise<Question> {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_BASE}/api/admin/questions/${question.id}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(question)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to edit question');
  }

  return response.json();
}

export async function deleteQuestion(questionId: string): Promise<void> {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_BASE}/api/admin/questions/${questionId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete question');
  }
}

export async function fetchAllQuestions(): Promise<Question[]> {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_BASE}/api/admin/questions`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch questions');
  }

  return response.json();
}

export async function saveProgress(userId: number, score: number, total: number) {
  const response = await fetch(`${API_BASE}/api/progress`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    },
    body: JSON.stringify({ userId, score, total }),
    credentials: 'include'
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to save progress');
  }
  
  return response.json();
}

export async function fetchQuestions(): Promise<{data: {questions: Question[]}}> {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('No authentication token');

  const response = await fetch(`${API_BASE}/api/questions`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    credentials: 'include'
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch questions');
  }

  const data = await response.json();
  return {
    data: {
      questions: data.questions.map((q: any) => ({
        ...q,
        id: q.id.toString()
      }))
    }
  };
}