import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline, Box, Typography, Button } from '@mui/material';
import { theme } from './theme';
import Quiz from './components/Quiz';
import Navigation from './components/Navigation';
import AuthForm from './components/AuthForm';
import AdminPanel from './components/AdminPanel';
import AdminDashboard from './components/AdminDashboard';
import UserManagement from './components/UserManagement';
import Leaderboard from './components/Leaderboard';
import AdminDiagnostic from './components/AdminDiagnostic';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import { useAuth } from './contexts/AuthContext';
import apiClient, { ApiResponse } from './utils/apiClient';
import { Question } from './types';

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
  questions: Question[];
}

const App: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qualification, setQualification] = useState<QualificationResponse | null>(null);

  useEffect(() => {
    const validateAndFetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        if (!user) {
          setLoading(false);
          return;
        }
        
        // The response will be of type AxiosResponse<QualificationResponse | ApiResponse<QualificationResponse>>
        const response = await apiClient.get<QualificationResponse | ApiResponse<QualificationResponse>>('/qualification');
        
        // Handle both response formats
        const responseData = response.data;
        let qualificationData: QualificationResponse;
        
        // Type guard to check if the response is a direct QualificationResponse
        const isDirectResponse = (data: any): data is QualificationResponse => {
          return data && typeof data === 'object' && 
                 ('isQualified' in data || 'qualifies_for_next_round' in data);
        };
        
        // Type guard to check if the response is an ApiResponse
        const isApiResponse = (data: any): data is ApiResponse<QualificationResponse> => {
          return data && typeof data === 'object' && 'data' in data;
        };
        
        if (isDirectResponse(responseData)) {
          // Direct QualificationResponse
          qualificationData = responseData as QualificationResponse;
        } else if (isApiResponse(responseData)) {
          // Wrapped in ApiResponse
          qualificationData = responseData.data;
        } else {
          throw new Error('Unexpected response format from qualification endpoint');
        }
        
        setQualification(qualificationData);
        
        // Only fetch questions if user is qualified or hasn't attempted yet
        if (!qualificationData.hasAttempted || qualificationData.isQualified) {
          try {
            const questionsResponse = await apiClient.get<QuestionsResponse>('/questions');
            setQuestions(questionsResponse.questions || []);
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
      await apiClient.post('/progress', { 
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
