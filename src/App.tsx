import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline, Box, Typography, Button } from '@mui/material';
import { theme } from './theme';
import Quiz from './components/Quiz';
import Navigation from './components/Navigation';
import AuthForm from './components/AuthForm';
import AdminPanel from './components/AdminPanel';
import AdminDashboard from './components/AdminDashboard';
import Leaderboard from './components/Leaderboard';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import { useAuth } from './contexts/AuthContext';
import api from './utils/api';
import { Question } from './types';

interface ApiQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
  category?: string;
  difficulty?: string;
  timeLimit?: number;
}

const App: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qualification, setQualification] = useState<{
    hasAttempted: boolean;
    isQualified: boolean;
    score?: number;
    totalQuestions?: number;
    percentageScore?: number;
    minimumRequired?: number;
    message: string;
  } | null>(null);

  useEffect(() => {
    const validateAndFetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // First check qualification status
        const qualificationResponse = await api.get('/qualification');
        setQualification(qualificationResponse.data as {
          hasAttempted: boolean;
          isQualified: boolean;
          score?: number;
          totalQuestions?: number;
          percentageScore?: number;
          minimumRequired?: number;
          message: string;
        });
        
        // Type assertion for the qualification data
        const qualificationData = qualificationResponse.data as {
          hasAttempted: boolean;
          isQualified: boolean;
          score?: number;
          totalQuestions?: number;
          percentageScore?: number;
          minimumRequired?: number;
          message: string;
        };
        
        // Only fetch questions if user is qualified or hasn't attempted yet
        if (!qualificationData.hasAttempted || qualificationData.isQualified) {
          const response = await api.get<{ data: { questions: ApiQuestion[] } }>('/questions');

          // Convert numeric IDs to strings
          const convertedQuestions = response.data.data.questions.map(q => ({
            ...q,
            id: q.id.toString(),
            correctAnswer: q.correctAnswer.toString()
          }));

          setQuestions(convertedQuestions);
        }
      } catch (err: any) {
        console.error('Failed to fetch data:', err);
        setError(err.message || 'Failed to load data');
        
        // If unauthorized, clear tokens and redirect to login
        if (err.response?.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          navigate('/login');
        }
      } finally {
        setLoading(false);
      }
    };

    // Only fetch data if user is logged in
    if (user) {
      validateAndFetchData();
    }
  }, [user, navigate]);

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
            {/* Public routes */}
            <Route path="/login" element={
              user ? <Navigate to={isAdmin() ? '/admin' : '/quiz'} replace /> : <AuthForm mode="login" />
            } />
            <Route path="/register" element={
              user ? <Navigate to={isAdmin() ? '/admin' : '/quiz'} replace /> : <AuthForm mode="register" />
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
                        {qualification.message}
                      </Typography>
                      <Box sx={{ background: 'rgba(0,0,0,0.2)', p: 3, borderRadius: 2, maxWidth: '500px', mx: 'auto' }}>
                        <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 2 }}>
                          Your Score: {qualification.score} / {qualification.totalQuestions} ({qualification.percentageScore}%)
                        </Typography>
                        <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                          Required Score: {qualification.minimumRequired} / {qualification.totalQuestions} (50%)
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

            {/* Protected admin routes */}
            <Route path="/admin" element={
              <ProtectedRoute adminOnly>
                <Layout>
                  <AdminPanel />
                </Layout>
              </ProtectedRoute>
            } />
            
            <Route path="/dashboard" element={
              <ProtectedRoute adminOnly>
                <Layout>
                  <AdminDashboard />
                </Layout>
              </ProtectedRoute>
            } />

            {/* Default routes */}
            <Route path="/" element={
              user ? <Navigate to="/leaderboard" replace /> : <Navigate to="/login" replace />
            } />
            
            <Route path="*" element={
              user ? <Navigate to="/leaderboard" replace /> : <Navigate to="/login" replace />
            } />
          </Routes>
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default App;
