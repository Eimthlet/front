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
import AdminPanel from './components/AdminPanel';
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
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const [questions, setQuestions] = useState<ApiQuestion[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [qualification, setQualification] = useState<QualificationResponse | null>(null);
  
  // Memoized function to set error state
  const handleError = useCallback((error: unknown) => {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error(errorMessage, error);
    setError(errorMessage);
  }, []);

  // Memoized function to fetch qualification status and handle qualification flow
  const fetchQualification = useCallback(async () => {
    if (!user) {
      console.log('No user, skipping qualification check');
      setLoading(false);
      return;
    }

    console.group('fetchQualification');
    setLoading(true);
    setError(null);

    try {
      console.log('Fetching qualification status...');
      // Use the full URL to bypass any automatic prefixing
      const response = await api.get('/qualification', { 
        withCredentials: true,
        // Add a custom config to prevent any automatic prefixing
        _skipApiPrefix: true
      });
      
      // The response data is already the object we need
      const responseData = response?.data;

      // Log the raw response for debugging
      console.log('Raw qualification response:', responseData);

      // If response is an object with the expected properties
      if (responseData && typeof responseData === 'object') {
        // Use the response data directly as it's already in the expected format
        const data = responseData;
        
        const qualData: QualificationResponse = {
          hasAttempted: Boolean(data.hasAttempted),
          isQualified: Boolean(data.isQualified || data.qualifies_for_next_round),
          score: typeof data.score === 'number' ? data.score : undefined,
          totalQuestions: typeof data.totalQuestions === 'number' ? data.totalQuestions : undefined,
          percentageScore: data.percentageScore || undefined,
          minimumRequired: data.minimumRequired || undefined,
          message: data.message || 'No qualification data available',
          ...data
        };

        console.log('Processed qualification data:', qualData);
        setQualification(qualData);

        // If user hasn't attempted yet, this is a valid state
        if (!qualData.hasAttempted) {
          console.log('No previous attempt found. User needs to start a qualification attempt.');
          setQuestions([]);
          return;
        }

        // If already qualified, load regular questions
        if (qualData.isQualified) {
          try {
            console.log('Fetching regular questions for qualified user...');
            const questionsResponse = await api.get('/questions');
            const questionsData = Array.isArray(questionsResponse?.data) 
              ? questionsResponse.data 
              : questionsResponse?.data?.questions || [];
            
            console.log(`Loaded ${questionsData.length} regular questions`);
            setQuestions(questionsData);
          } catch (error) {
            console.error('Error loading questions:', error);
            handleError(new Error('Failed to load questions'));
          }
        }
      } else {
        // If we get here, the response format is unexpected
        console.error('Unexpected response format:', responseData);
        setQualification({
          hasAttempted: false,
          isQualified: false,
          message: 'Could not determine qualification status'
        });
      }
    } catch (error: any) {
      console.error('Error in fetchQualification:', error);
      
      // Log response details if available
      if (error.response) {
        console.log('Response data:', error.response.data);
        console.log('Response status:', error.response.status);
        console.log('Response headers:', error.response.headers);
        
        // If we have a 404, it means the endpoint doesn't exist
        if (error.response.status === 404) {
          console.log('Qualification endpoint not found, proceeding without qualification');
          setQualification({
            hasAttempted: false,
            isQualified: false,
            message: 'Qualification feature is not available.'
          });
          return;
        } else {
          handleError(new Error(error.response.data?.message || 'Failed to load qualification data'));
        }
      } else if (error.request) {
        // The request was made but no response was received
        console.error('No response received:', error.request);
        handleError(new Error('No response from server. Please check your connection.'));
      } else {
        // Something happened in setting up the request
        handleError(error instanceof Error ? error : new Error('Failed to load qualification data'));
      }
    } finally {
      setLoading(false);
      console.groupEnd();
    }
  }, [user, handleError]);

  useEffect(() => {
    // Only fetch qualification if auth is loaded and user is present
    if (!authLoading && user) {
      fetchQualification();
    } else if (!authLoading && !user) {
      // If auth is loaded and there's no user, no need to fetch qualification, stop app loading
      setLoading(false);
    }
  }, [authLoading, user, fetchQualification]);

  const handleQuizComplete = useCallback(async (score: number, answers: { questionId: string; answer: string }[]) => {
    try {
      setLoading(true);
      // Submit the quiz attempt with the score and answers
      await api.post('/quiz/submit', { 
        score,
        answers,
        attemptType: qualification?.hasAttempted ? 'qualification' : 'regular'
      });
      // Refresh the qualification status
      await fetchQualification();
    } catch (error) {
      handleError(new Error('Failed to submit quiz results'));
    } finally {
      setLoading(false);
    }
  }, [fetchQualification, handleError, qualification]);

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
                {!qualification ? (
                  <Box textAlign="center" mt={10}>
                    <CircularProgress />
                    <Typography variant="body1" mt={2}>Loading quiz data...</Typography>
                  </Box>
                ) : qualification.hasAttempted ? (
                  <Box textAlign="center" mt={10} p={3} sx={{ maxWidth: 600, mx: 'auto', bgcolor: 'background.paper', borderRadius: 2, boxShadow: 1 }}>
                    <Typography variant="h4" gutterBottom color="primary">
                      {qualification.isQualified ? 'Qualification Complete!' : 'Qualification Attempted'}
                    </Typography>
                    
                    <Typography variant="h6" color={qualification.isQualified ? 'success.main' : 'error.main'} mb={3}>
                      {qualification.isQualified 
                        ? 'Congratulations! You have qualified for the quiz.' 
                        : 'You have already attempted the qualification quiz.'}
                    </Typography>
                    
                    {qualification.score !== undefined && qualification.totalQuestions && (
                      <Box mb={3}>
                        <Typography variant="body1">
                          Your score: <strong>{qualification.score} / {qualification.totalQuestions}</strong>
                          {qualification.percentageScore && ` (${qualification.percentageScore})`}
                        </Typography>
                        <Typography variant="body1">
                          Minimum required: {qualification.minimumRequired || 50}%
                        </Typography>
                        {qualification.completed_at && (
                          <Typography variant="body2" color="text.secondary" mt={1}>
                            Attempted on: {new Date(qualification.completed_at).toLocaleString()}
                          </Typography>
                        )}
                      </Box>
                    )}
                    
                    <Typography variant="body1" mb={3}>
                      {qualification.message || 
                        (qualification.isQualified 
                          ? 'You can now participate in the main quiz.' 
                          : 'You have already attempted the qualification quiz.')}
                    </Typography>
                    
                    <Box>
                      {qualification.isQualified ? (
                        <Button 
                          variant="contained" 
                          color="primary"
                          onClick={() => fetchQualification()}
                          sx={{ mt: 2, mr: 2 }}
                        >
                          Continue to Quiz
                        </Button>
                      ) : (
                        <Button 
                          variant="outlined" 
                          color="primary"
                          onClick={() => window.location.reload()}
                          sx={{ mt: 2, mr: 2 }}
                        >
                          Refresh Status
                        </Button>
                      )}
                      <Button 
                        variant="contained" 
                        color="secondary"
                        onClick={() => navigate('/leaderboard')}
                        sx={{ mt: 2 }}
                      >
                        View Leaderboard
                      </Button>
                    </Box>
                  </Box>
                ) : (
                  <Box textAlign="center" mt={10}>
                    <Typography variant="h4" gutterBottom>
                      Welcome to the Quiz!
                    </Typography>
                    <Typography variant="body1" mb={4}>
                      You need to complete a qualification quiz before you can start.
                    </Typography>
                    <Button 
                      variant="contained" 
                      color="primary" 
                      size="large"
                      onClick={async () => {
                        try {
                          setLoading(true);
                          const qualificationData = await startQualificationAttempt();
                          if (qualificationData.success && qualificationData.questions?.length) {
                            setQuestions(qualificationData.questions);
                          } else {
                            handleError(new Error(qualificationData.message || 'Failed to start qualification quiz'));
                          }
                        } catch (error) {
                          handleError(error);
                        } finally {
                          setLoading(false);
                        }
                      }}
                      disabled={loading}
                      sx={{ mt: 2 }}
                    >
                      {loading ? 'Starting...' : 'Start Qualification Quiz'}
                    </Button>
                  </Box>
                )}
                
                {questions.length > 0 ? (
                  <Quiz 
                    questions={questions.map(q => ({
                      id: q.id.toString(),
                      question: q.question || q.question_text || 'No question text',
                      options: q.options,
                      correctAnswer: q.correctAnswer || q.correct_answer?.toString() || '',
                      timeLimit: q.timeLimit,
                      explanation: q.explanation
                    }))} 
                    onComplete={(score, answers) => handleQuizComplete(score, answers)} 
                  />
                ) : (
                  qualification?.hasAttempted && !qualification?.isQualified ? (
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
                  ) : (
                    <Box textAlign="center" mt={10}>
                      <Typography variant="h5" gutterBottom>
                        No Questions Available
                      </Typography>
                      <Typography variant="body1">
                        There are no questions available at the moment. Please check back later.
                      </Typography>
                    </Box>
                  )
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
