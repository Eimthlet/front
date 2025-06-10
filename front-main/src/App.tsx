import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline, Box, Typography, CircularProgress, Button } from '@mui/material';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Quiz from './components/Quiz';
import AuthForm from './components/AuthForm';
import api, { startQualificationAttempt } from './utils/api';
import { theme } from './theme';
import Navigation from './components/Navigation';
import AdminDashboard from './components/AdminDashboard';
import UserManagement from './components/UserManagement';
import AdminPanel from './components/AdminPanel'; // Added for Admin Panel route
import Leaderboard from './components/Leaderboard';

// Internal question format from API
interface ApiQuestion {
  id: string | number;
  question_text?: string;
  question?: string;
  options: string[];
  correct_answer?: string | number;
  correctAnswer?: string;
  timeLimit?: number;
  explanation?: string;
}



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

const App: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAdmin, isLoading: authLoading } = useAuth(); // Destructure isLoading as authLoading
  const [questions, setQuestions] = useState<ApiQuestion[]>([]);
  const [loading, setLoading] = useState(true); // This is for app-specific data like qualifications/questions
  const [error, setError] = useState<string | null>(null);
  const [qualification, setQualification] = useState<QualificationResponse | null>(null);

  const fetchQualification = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!user) {
        console.log('No user, skipping qualification check');
        setLoading(false);
        return;
      }
      
      console.log('Fetching qualification status...');
      // Get the qualification data from the API
      const response = await api.get('/qualification');
      const responseData = response?.data;
      console.log('Qualification response:', responseData);
      
      if (responseData && typeof responseData === 'object') {
        const qualData = {
          hasAttempted: Boolean(responseData.hasAttempted),
          isQualified: Boolean(responseData.isQualified || responseData.qualifies_for_next_round),
          message: responseData.message,
          ...responseData
        };
        
        console.log('Setting qualification data:', qualData);
        setQualification(qualData);
        
        // If user hasn't attempted yet, start a new qualification attempt
        if (!qualData.hasAttempted) {
          console.log('No previous attempt, starting new qualification...');
          try {
            console.log('Calling startQualificationAttempt()...');
            const qualificationData = await startQualificationAttempt();
            console.log('startQualificationAttempt response:', qualificationData);
            
            if (qualificationData.success && qualificationData.questions) {
              console.log('Setting questions from qualification attempt:', qualificationData.questions);
              setQuestions(qualificationData.questions);
            } else {
              console.log('No questions received from qualification attempt');
            }
          } catch (err) {
            console.error('Error starting qualification attempt:', err);
            setError('Failed to start qualification quiz');
          }
        } else if (qualData.isQualified) {
          // If already qualified, just load regular questions
          try {
            const questionsResponse = await api.get('/questions');
            const questionsData = questionsResponse?.data;
            
            const fetchedQuestions = Array.isArray(questionsData) 
              ? questionsData 
              : questionsData?.questions || [];
              
            setQuestions(fetchedQuestions);
          } catch (err) {
            console.error('Error fetching questions:', err);
            setError('Failed to load questions');
          }
        }
      } else {
        setQualification({
          hasAttempted: false,
          isQualified: false,
          message: 'Could not determine qualification status'
        });
      }
    } catch (err) {
      console.error('Error in qualification flow:', err);
      setError(err instanceof Error ? err.message : 'Failed to load qualification data');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    // Only fetch qualification if auth is loaded and user is present
    if (!authLoading && user) {
      fetchQualification();
    } else if (!authLoading && !user) {
      // If auth is loaded and there's no user, no need to fetch qualification, stop app loading
      setLoading(false);
    }
  }, [authLoading, user, fetchQualification]);

  const handleQuizComplete = useCallback(async (score: number) => {
    try {
      setLoading(true);
      // Submit the quiz attempt with the current score
      await api.post('/quiz/submit', { 
        score,
        // Include any additional data needed for submission
      });
      // Refresh the qualification status
      await fetchQualification();
    } catch (err) {
      console.error('Error submitting quiz:', err);
      setError('Failed to submit quiz results');
    } finally {
      setLoading(false);
    }
  }, [fetchQualification]);

  // Render loading state: wait for auth to load AND for app data (qualifications/questions) to load
  if (authLoading || loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  // Render error state
  if (error) {
    return (
      <Box p={4}>
        <Typography color="error" variant="h6">
          {error}
        </Typography>
        <Button onClick={fetchQualification} variant="contained" sx={{ mt: 2 }}>
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Navigation />
      <Box component="main" sx={{ p: 3 }}>
        <Routes>
          <Route path="/login" element={!user ? <AuthForm mode="login" /> : <Navigate to="/" replace />} />
          
          <Route path="/admin" element={
            <ProtectedRoute requiredAdmin={true}>
              <AdminDashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/admin/users" element={
            <ProtectedRoute requiredAdmin={true}>
              <UserManagement />
            </ProtectedRoute>
          } />

          <Route path="/admin/panel" element={
            <ProtectedRoute requiredAdmin={true}>
              <AdminPanel />
            </ProtectedRoute>
          } />
          
          <Route path="/quiz" element={
            <ProtectedRoute>
              <Layout>
                {qualification?.hasAttempted && !qualification?.isQualified ? (
                  <Box textAlign="center" mt={10}>
                    <Typography variant="h5" color="error" gutterBottom>
                      Quiz Attempted
                    </Typography>
                    <Typography variant="body1" mb={4}>
                      {qualification.message || 'You have already attempted this quiz.'}
                    </Typography>
                    <Button 
                      variant="contained" 
                      color="primary" 
                      onClick={() => navigate('/leaderboard')}
                    >
                      View Leaderboard
                    </Button>
                  </Box>
                ) : questions.length > 0 ? (
                  <Quiz 
                    questions={questions.map(q => ({
                      id: q.id.toString(),
                      question: q.question || q.question_text || 'No question text',
                      options: q.options,
                      correctAnswer: q.correctAnswer || q.correct_answer?.toString() || '',
                      timeLimit: q.timeLimit,
                      explanation: q.explanation
                    }))} 
                    onComplete={handleQuizComplete} 
                  />
                ) : (
                  <Box textAlign="center" mt={10}>
                    <Typography variant="h5" gutterBottom>
                      No Questions Available
                    </Typography>
                    <Typography variant="body1">
                      There are no questions available at the moment. Please check back later.
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
          
          <Route path="/" element={
            <Navigate to={user ? (isAdmin ? '/admin' : '/quiz') : '/login'} replace />
          } />
          
          <Route path="*" element={
            <Navigate to="/" replace />
          } />
        </Routes>
      </Box>
    </ThemeProvider>
  );
};

export default App;
