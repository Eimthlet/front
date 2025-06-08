import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline, Box, Typography, Button } from '@mui/material';
import { theme } from './theme';
import Quiz from './components/Quiz';
import Navigation from './components/Navigation';
import AuthForm from './components/AuthForm';
import AdminDashboard from './components/AdminDashboard';
import UserManagement from './components/UserManagement';
import Leaderboard from './components/Leaderboard';
import AdminDiagnostic from './components/AdminDiagnostic';
import AdminPanel from './components/AdminPanel';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import { useAuth } from './contexts/AuthContext';
import { api } from './utils/api';
import { Question as ApiQuestion } from './types';

interface QualificationResponse {
  hasAttempted: boolean;
  isQualified: boolean;
  score?: number;
  totalQuestions?: number;
  percentageScore?: string;
  minimumRequired?: number;
  message?: string;
  qualifies_for_next_round?: boolean;
  completed?: boolean;
  completed_at?: string;
}

interface QuestionsResponse {
  questions: QuizQuestion[];
}

type QuizQuestion = {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  timeLimit?: number;
}

const App: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qualification, setQualification] = useState<QualificationResponse | null>(null);
  
  // Type to narrow down the qualification response
  type QualificationApiResponse = {
    hasAttempted: boolean;
    isQualified?: boolean;
    qualifies_for_next_round?: boolean;
    [key: string]: any; // Allow additional properties
  };
  
  // Define the QuizQuestion type that matches what the Quiz component expects
  interface QuizQuestion {
    id: string;
    question: string;
    options: string[];
    correctAnswer: string;
    timeLimit?: number;
  }

  useEffect(() => {
    const validateAndFetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        if (!user) {
          setLoading(false);
          return;
        }
        
        // Get the qualification data from the API
        const response = await api.get<QualificationApiResponse>('/qualification');
        
        // The API client now returns the data directly, but we'll add a safety check
        const responseData = response && typeof response === 'object' ? response : null;
        
        // Validate the response structure
        if (!responseData) {
          throw new Error('Invalid response format from qualification endpoint');
        }
        
        // Create a properly typed qualification object
        const qualificationData: QualificationResponse = {
          hasAttempted: false,
          isQualified: false,
          // Include any additional properties that might be present
          ...responseData
        };
        
        // Set the correct values from the response
        if ('hasAttempted' in responseData) {
          qualificationData.hasAttempted = Boolean(responseData.hasAttempted);
        }
        
        if ('isQualified' in responseData || 'qualifies_for_next_round' in responseData) {
          qualificationData.isQualified = Boolean(
            (responseData as any).isQualified || 
            (responseData as any).qualifies_for_next_round
          );
        }
        
        setQualification(qualificationData);
        
        // Only fetch questions if user is qualified or hasn't attempted yet
        if (!qualificationData.hasAttempted || qualificationData.isQualified) {
          try {
            // Get questions from the API
            const questionsData = await api.get<ApiQuestion[] | QuestionsResponse>('/questions');
            
            // Handle both direct array response and wrapped response
            const questions = Array.isArray(questionsData) 
              ? questionsData 
              : 'questions' in questionsData && Array.isArray(questionsData.questions) 
                ? questionsData.questions 
                : [];
                
            // Map the API question format to the Quiz component's expected format
            const mappedQuestions = questions.map((q) => {
              // Check if this is an ApiQuestion (has question_text and correct_answer)
              if ('question_text' in q && 'correct_answer' in q) {
                return {
                  id: q.id?.toString() || Math.random().toString(36).substr(2, 9),
                  question: q.question_text,
                  options: q.options,
                  correctAnswer: q.correct_answer,
                  timeLimit: 30 // Default time limit if not provided
                };
              }
              // Otherwise, assume it's already in the correct QuizQuestion format
              return q as QuizQuestion;
            });
            
            setQuestions(mappedQuestions);
          } catch (apiError: any) {
            console.error('Error fetching questions:', apiError);
            setError(apiError.message || 'Failed to load questions');
            setQuestions([]);
          }
        }
      } catch (err: any) {
        console.error('Failed to fetch data:', err);
        setError(err.message || 'Failed to load data');
        
        // If unauthorized, clear tokens and redirect to login
        if (err.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          navigate('/login');
        }
      } finally {
        setLoading(false);
      }
    };

    validateAndFetchData();
  }, [navigate, user]);

  const handleQuizComplete = async (score: number) => {
    try {
      await api.post('/progress', { 
        userId: user?.id, 
        score, 
        total: questions.length 
      });
    } catch (err) {
      console.error('Error submitting quiz progress:', err);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)'
      }}>
        <Navigation />
        <Box component="main" sx={{ 
          flexGrow: 1,
          '& .MuiButton-contained': {
            background: 'rgba(255, 255, 255, 0.1)',
            color: '#fff',
            '&:hover': {
              background: 'rgba(255, 255, 255, 0.2)',
            },
            textTransform: 'none',
          },
          '& .MuiTypography-root': {
            color: '#fff',
          },
          '& .MuiCard-root': {
            background: 'rgba(18, 18, 18, 0.8)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
          }
        }}>
          <Routes>
            {/* Auth routes */}
            <Route path="/login" element={
              user ? <Navigate to={isAdmin ? '/admin' : '/quiz'} replace /> : <AuthForm mode="login" />
            } />
            <Route path="/register" element={
              user ? <Navigate to={isAdmin ? '/admin' : '/quiz'} replace /> : <AuthForm mode="register" />
            } />

            {/* Protected admin routes - must come first */}
            <Route path="/admin/*" element={
              <ProtectedRoute requiredAdmin>
                <Layout>
                  <Routes>
                    <Route path="" element={<AdminDashboard />} />
                    <Route path="users" element={<UserManagement />} />
                    <Route path="diagnostic" element={<AdminDiagnostic />} />
                    <Route path="panel" element={<AdminPanel />} />
                    <Route path="*" element={<Navigate to="" replace />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            } />

            {/* Protected user routes */}
            <Route path="/quiz" element={
              <ProtectedRoute>
                <Layout>
                  {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
                      <Typography variant="h5" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                        Loading questions...
                      </Typography>
                    </Box>
                  ) : error ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
                      <Typography variant="h5" sx={{ color: '#ff6b6b' }}>
                        {error}
                      </Typography>
                    </Box>
                  ) : qualification?.hasAttempted && !qualification.isQualified ? (
                    <Box sx={{ textAlign: 'center', mt: 10 }}>
                      <Typography variant="h4" sx={{ color: '#ff6b6b', mb: 2 }}>
                        Quiz Access Restricted
                      </Typography>
                      <Typography variant="h6" sx={{ color: 'rgba(255, 255, 255, 0.8)', mb: 3 }}>
                        You have already attempted the quiz for this season.
                      </Typography>
                      <Box sx={{ background: 'rgba(0,0,0,0.2)', p: 3, borderRadius: 2, maxWidth: '500px', mx: 'auto' }}>
                        <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 2 }}>
                          Your Score: {qualification.score}
                        </Typography>
                        <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                          Required Score: {qualification.minimumRequired}
                        </Typography>
                      </Box>
                      <Button 
                        variant="contained" 
                        sx={{ mt: 4, background: 'rgba(255,255,255,0.1)' }}
                        onClick={() => navigate('/leaderboard')}
                      >
                        View Leaderboard
                      </Button>
                    </Box>
                  ) : questions.length > 0 ? (
                    <Quiz questions={questions} onComplete={handleQuizComplete} />
                  ) : (
                    <Box sx={{ textAlign: 'center', mt: 10 }}>
                      <Typography variant="h4" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                        No questions available
                      </Typography>
                      <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                        Please wait for the next quiz season
                      </Typography>
                    </Box>
                  )}
                </Layout>
              </ProtectedRoute>
            } />
            
            <Route path="/leaderboard" element={
              <ProtectedRoute>
                <Layout>
                  <Leaderboard />
                </Layout>
              </ProtectedRoute>
            } />

            {/* Default routes */}
            <Route path="/" element={
              !user ? <Navigate to="/login" replace /> :
              isAdmin ? <Navigate to="/admin" replace /> :
              <Navigate to="/leaderboard" replace />
            } />
            
            {/* Catch-all route */}
            <Route path="*" element={
              !user ? <Navigate to="/login" replace /> :
              isAdmin ? <Navigate to="/admin" replace /> :
              <Navigate to="/quiz" replace />
            } />
          </Routes>
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default App;
