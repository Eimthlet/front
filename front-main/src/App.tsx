import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { 
  ThemeProvider, 
  CssBaseline, 
  Box, 
  Typography, 
  CircularProgress, 
  Button, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogContentText, 
  DialogActions,
  Alert,
  AlertTitle,
  Collapse,
  IconButton
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Quiz from './components/Quiz';
import AuthForm from './components/AuthForm';
import api from './utils/api';
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
  options: string[] | any;
  correct_answer?: string | number;
  correctAnswer?: string;
  timeLimit?: number;
  explanation?: string;
  category?: string;
  difficulty?: string;
}

// Quiz component props
export type Question = {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  timeLimit?: number;
  explanation?: string;
  category?: string;
  difficulty?: string;
};

interface BaseQualificationResponse {
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
  questions?: Question[];
}

type QualificationResponse = BaseQualificationResponse;

type FetchQualificationResponse = BaseQualificationResponse & {
  id?: string | number;
  error?: string;
};

interface QualificationAttemptResponse {
  success: boolean;
  questions?: Question[];
  message?: string;
  attemptId?: string;
  error?: any; // For detailed error information
}

const App: React.FC = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [startingQuiz, setStartingQuiz] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [qualification, setQualification] = useState<QualificationResponse | null>(null);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  
  // Ref to track if component is mounted
  const isMountedRef = useRef<boolean>(true);
  
  // Memoized function to set error state
  const handleError = useCallback((error: unknown, customMessage?: string) => {
    if (!isMountedRef.current) return;
    
    let errorMessage: string;
    
    if (customMessage) {
      errorMessage = customMessage;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else {
      errorMessage = 'An unknown error occurred';
    }
    
    console.error('App Error:', errorMessage, error);
    setError(errorMessage);
  }, []);

  // Function to convert API questions to the required format
  const normalizeQuestions = useCallback((apiQuestions: ApiQuestion[]): Question[] => {
    if (!Array.isArray(apiQuestions)) {
      console.warn('Expected array of questions, received:', typeof apiQuestions);
      return [];
    }
    
    return apiQuestions.map(q => {
      // Validate required fields
      if (!q.id) {
        console.warn('Question missing ID:', q);
      }
      
      // Ensure options is an array
      let options: string[] = [];
      if (Array.isArray(q.options)) {
        options = q.options.map(opt => String(opt));
      } else if (q.options && typeof q.options === 'object') {
        options = Object.values(q.options).map(opt => String(opt));
      }
      
      return {
        id: String(q.id || Math.random()),
        question: q.question || q.question_text || 'No question provided',
        options,
        correctAnswer: q.correctAnswer || String(q.correct_answer || ''),
        timeLimit: typeof q.timeLimit === 'number' ? q.timeLimit : undefined,
        explanation: typeof q.explanation === 'string' ? q.explanation : undefined,
        category: typeof q.category === 'string' ? q.category : undefined,
        difficulty: typeof q.difficulty === 'string' ? q.difficulty : undefined
      };
    });
  }, []);
  
  // Function to fetch qualification status
  const fetchQualificationStatus = useCallback(async (): Promise<FetchQualificationResponse | null> => {
    if (!user || !isMountedRef.current) return null;
    
    try {
      setLoading(true);
      const response = await api.get('/qualification');
      
      if (!isMountedRef.current) return null;
      
      const responseData = response?.data;

      if (responseData && typeof responseData === 'object') {
        const qualData: QualificationResponse = {
          hasAttempted: Boolean(responseData.hasAttempted),
          isQualified: Boolean(responseData.isQualified || responseData.qualifies_for_next_round),
          score: typeof responseData.score === 'number' ? responseData.score : undefined,
          totalQuestions: typeof responseData.totalQuestions === 'number' ? responseData.totalQuestions : undefined,
          percentageScore: typeof responseData.percentageScore === 'string' ? responseData.percentageScore : undefined,
          minimumRequired: typeof responseData.minimumRequired === 'number' ? responseData.minimumRequired : undefined,
          message: typeof responseData.message === 'string' ? responseData.message : 'No qualification data available',
          qualifies_for_next_round: Boolean(responseData.qualifies_for_next_round),
          completed: Boolean(responseData.completed),
          completed_at: typeof responseData.completed_at === 'string' ? responseData.completed_at : undefined
        };
        
        if (isMountedRef.current) {
          setQualification(qualData);
        }
        return qualData;
      }
      return null;
    } catch (error) {
      if (isMountedRef.current) {
        handleError(error, 'Failed to fetch qualification status');
      }
      return null;
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [user, handleError]);

  // Function to start qualification attempt
  const startQualification = useCallback(async (): Promise<QualificationAttemptResponse> => {
    console.log('Starting qualification quiz...');
    try {
      setStartingQuiz(true);
      console.log('Sending request to /api/quiz/start-qualification');
      const response = await api.post('/quiz/start-qualification');
      
      if (!isMountedRef.current) {
        console.log('Component unmounted, aborting');
        return { success: false, message: 'Component unmounted' };
      }
      
      console.log('Received response:', response);
      const responseData = response?.data;
      console.log('Response data:', responseData);
      
      if (!responseData) {
        throw new Error('No data received from server');
      }
      
      let questions: Question[] = [];
      
      if (responseData?.questions) {
        console.log('Normalizing questions...');
        questions = normalizeQuestions(responseData.questions);
        console.log(`Normalized ${questions.length} questions`);
      } else {
        console.warn('No questions in response');
      }
      
      const result = {
        success: true,
        questions,
        attemptId: responseData?.attemptId,
        message: responseData?.message || 'Quiz started successfully'
      };
      
      console.log('Qualification quiz started successfully:', result);
      return result;
      
    } catch (error: any) {
      console.error('Failed to start qualification:', error);
      
      // Log detailed error information
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Error response data:', error.response.data);
        console.error('Error status:', error.response.status);
        console.error('Error headers:', error.response.headers);
      } else if (error.request) {
        // The request was made but no response was received
        console.error('No response received:', error.request);
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Error message:', error.message);
      }
      
      const errorMessage = error.response?.data?.message || 
                         error.message || 
                         'Failed to start qualification quiz. Please try again.';
                         
      if (isMountedRef.current) {
        handleError(error, errorMessage);
      }
      
      return {
        success: false,
        message: errorMessage,
        error: error.response?.data || error.message
      };
      
    } finally {
      if (isMountedRef.current) {
        setStartingQuiz(false);
      }
    }
  }, [normalizeQuestions, handleError]);
  
  // Handle quiz completion
  const handleQuizComplete = useCallback(async (score: number, answers: { questionId: string; answer: string }[]) => {
    if (!isMountedRef.current) return;
    
    try {
      setLoading(true);
      await api.post('/quiz/submit', { score, answers });
      
      if (isMountedRef.current) {
        await fetchQualificationStatus();
        // Clear questions after successful submission
        setQuestions([]);
      }
    } catch (error) {
      if (isMountedRef.current) {
        handleError(error, 'Failed to submit quiz results');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [fetchQualificationStatus, handleError]);

  // Handle starting qualification quiz
  const handleStartQualification = useCallback(async () => {
    try {
      const qualificationData = await startQualification();
      if (!isMountedRef.current) return;
      
      if (qualificationData.success && qualificationData.questions?.length) {
        setQuestions(qualificationData.questions);
        // Clear any previous errors
        setError(null);
      } else {
        handleError(new Error(qualificationData.message || 'Failed to start qualification quiz'));
      }
    } catch (error) {
      if (isMountedRef.current) {
        handleError(error);
      }
    }
  }, [startQualification, handleError]);

  // Function to retry failed operations
  const handleRetry = useCallback(() => {
    setError(null);
    if (user && !qualification) {
      fetchQualificationStatus();
    }
  }, [user, qualification, fetchQualificationStatus]);

  // Fetch qualification status on mount and when auth state changes
  useEffect(() => {
    isMountedRef.current = true;
    
    if (!authLoading && user) {
      fetchQualificationStatus().then((qualData) => {
        if (isMountedRef.current && qualData?.hasAttempted) {
          setShowStatusDialog(true);
        }
      });
    } else if (!authLoading && !user) {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
    
    return () => {
      isMountedRef.current = false;
    };
  }, [authLoading, user, fetchQualificationStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  if (authLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Navigation />
      <Box sx={{ pt: 8 }}>
        {/* Error Display */}
        <Collapse in={!!error}>
          <Box sx={{ mx: 2, mb: 2 }}>
            <Alert 
              severity="error" 
              action={
                <Box>
                  <Button 
                    color="inherit" 
                    size="small" 
                    onClick={handleRetry}
                    sx={{ mr: 1 }}
                  >
                    Retry
                  </Button>
                  <IconButton
                    aria-label="close"
                    color="inherit"
                    size="small"
                    onClick={() => setError(null)}
                  >
                    <CloseIcon fontSize="inherit" />
                  </IconButton>
                </Box>
              }
            >
              <AlertTitle>Error</AlertTitle>
              {error}
            </Alert>
          </Box>
        </Collapse>

        <Routes>
          <Route path="/" element={<Navigate to="/quiz" />} />
          <Route 
            path="/login" 
            element={!user ? <AuthForm mode="login" /> : <Navigate to="/quiz" />} 
          />
          
          {/* Quiz route with qualification check */}
          <Route 
            path="/quiz" 
            element={
              <ProtectedRoute>
                <Layout>
                  {loading ? (
                    <Box textAlign="center" mt={10}>
                      <CircularProgress size={60} />
                      <Typography variant="body1" mt={2}>Loading quiz data...</Typography>
                    </Box>
                  ) : (
                    <Box textAlign="center" mt={10}>
                      <Typography variant="h4" gutterBottom>
                        Welcome to the Quiz!
                      </Typography>
                      <Typography variant="body1" mb={4}>
                        {qualification?.hasAttempted 
                          ? 'Your qualification status is shown below.'
                          : 'You need to complete a qualification quiz before you can start.'}
                      </Typography>
                      
                      {!qualification?.hasAttempted && (
                        <Button 
                          variant="contained" 
                          color="primary" 
                          size="large"
                          onClick={handleStartQualification}
                          disabled={loading || startingQuiz}
                          sx={{ mt: 2 }}
                        >
                          {startingQuiz ? (
                            <>
                              <CircularProgress size={16} sx={{ mr: 1 }} />
                              Starting...
                            </>
                          ) : (
                            'Start Qualification Quiz'
                          )}
                        </Button>
                      )}
                      
                      {qualification?.hasAttempted && qualification.isQualified && (
                        <Button 
                          variant="contained" 
                          color="primary"
                          onClick={() => fetchQualificationStatus()}
                          disabled={loading}
                          sx={{ mt: 2, mr: 2 }}
                        >
                          {loading ? 'Loading...' : 'Continue to Main Quiz'}
                        </Button>
                      )}
                      
                      {qualification?.hasAttempted && !qualification.isQualified && (
                        <Box sx={{ mt: 3 }}>
                          <Typography variant="body1" color="text.secondary" mb={2}>
                            You can view the leaderboard to see other participants' progress.
                          </Typography>
                          <Button 
                            variant="outlined" 
                            color="primary"
                            onClick={() => navigate('/leaderboard')}
                          >
                            View Leaderboard
                          </Button>
                        </Box>
                      )}
                    </Box>
                  )}
                  
                  {/* Status Dialog */}
                  <Dialog
                    open={showStatusDialog && !!qualification?.hasAttempted}
                    onClose={() => setShowStatusDialog(false)}
                    aria-labelledby="qualification-status-dialog-title"
                    aria-describedby="qualification-status-dialog-description"
                    maxWidth="sm"
                    fullWidth
                  >
                    <DialogTitle id="qualification-status-dialog-title">
                      {qualification?.isQualified ? '🎉 Qualification Passed!' : '⚠️ Qualification Status'}
                    </DialogTitle>
                    <DialogContent>
                      <DialogContentText id="qualification-status-dialog-description" component="div">
                        {qualification?.isQualified ? (
                          <>
                            <Typography variant="h6" color="success.main" gutterBottom>
                              Congratulations! You've passed the qualification round.
                            </Typography>
                            <Typography variant="body1" paragraph>
                              You can now participate in the main quiz and compete with others.
                            </Typography>
                          </>
                        ) : (
                          <>
                            <Typography variant="h6" color="error" gutterBottom>
                              Qualification Completed
                            </Typography>
                            <Typography variant="body1" paragraph>
                              You have completed the qualification quiz, but didn't meet the minimum requirements to proceed.
                            </Typography>
                          </>
                        )}
                        
                        {qualification?.score !== undefined && qualification?.totalQuestions && (
                          <Box 
                            mt={2} 
                            mb={2} 
                            p={2} 
                            sx={{ 
                              bgcolor: 'background.default', 
                              borderRadius: 1,
                              border: '1px solid',
                              borderColor: 'divider'
                            }}
                          >
                            <Typography variant="body1" gutterBottom>
                              <strong>Your Results:</strong>
                            </Typography>
                            <Typography variant="body1">
                              Score: <strong>{qualification.score} / {qualification.totalQuestions}</strong>
                              {qualification.percentageScore && ` (${qualification.percentageScore})`}
                            </Typography>
                            <Typography variant="body1">
                              Minimum required: <strong>{qualification.minimumRequired || 50}%</strong>
                            </Typography>
                            {qualification.completed_at && (
                              <Typography variant="body2" color="text.secondary" mt={1}>
                                Completed on: {new Date(qualification.completed_at).toLocaleString()}
                              </Typography>
                            )}
                          </Box>
                        )}
                        
                        <Typography variant="body2" color="text.secondary">
                          {qualification?.message || 
                            (qualification?.isQualified 
                              ? 'You can now participate in the main quiz.' 
                              : 'Thank you for participating! You can view the leaderboard to see other participants.')}
                        </Typography>
                      </DialogContentText>
                    </DialogContent>
                    <DialogActions>
                      <Button onClick={() => setShowStatusDialog(false)} color="primary">
                        {qualification?.isQualified ? 'Continue to Quiz' : 'Close'}
                      </Button>
                      {!qualification?.isQualified && (
                        <Button 
                          onClick={() => {
                            setShowStatusDialog(false);
                            navigate('/leaderboard');
                          }} 
                          color="primary"
                          variant="contained"
                        >
                          View Leaderboard
                        </Button>
                      )}
                    </DialogActions>
                  </Dialog>
                  
                  {questions.length > 0 && (
                    <Quiz 
                      questions={questions} 
                      onComplete={handleQuizComplete} 
                      isQualificationRound={!qualification?.isQualified}
                    />
                  )}
                </Layout>
              </ProtectedRoute>
            } 
          />
          
          {/* Admin routes */}
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute requiredAdmin>
                <AdminPanel />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<UserManagement />} />
          </Route>
          
          <Route 
            path="/leaderboard" 
            element={
              <Layout>
                <Leaderboard />
              </Layout>
            } 
          />
          
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Box>
    </ThemeProvider>
  );
};

export default App;