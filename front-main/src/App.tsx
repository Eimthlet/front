import React, { useState, useEffect, useCallback } from 'react';
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
  DialogActions 
} from '@mui/material';
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
  options: string[];
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
}

const App: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [qualification, setQualification] = useState<QualificationResponse | null>(null);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  
  // Memoized function to set error state
  const handleError = useCallback((error: unknown) => {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error(errorMessage, error);
    setError(errorMessage);
  }, []);

  // Function to convert API questions to the required format
  const normalizeQuestions = useCallback((apiQuestions: ApiQuestion[]): Question[] => {
    return apiQuestions.map(q => ({
      ...q,
      id: String(q.id),
      question: q.question || q.question_text || 'No question provided',
      options: Array.isArray(q.options) ? q.options : [],
      correctAnswer: q.correctAnswer || String(q.correct_answer || '')
    }));
  }, []);
  
  // Function to fetch qualification status
  const fetchQualification = useCallback(async (): Promise<FetchQualificationResponse | null> => {
    if (!user) return null;
    
    try {
      setLoading(true);
      const response = await api.get('/quiz/qualification');
      const responseData = response?.data;

      if (responseData && typeof responseData === 'object') {
        const qualData: QualificationResponse = {
          hasAttempted: Boolean(responseData.hasAttempted),
          isQualified: Boolean(responseData.isQualified || responseData.qualifies_for_next_round),
          score: typeof responseData.score === 'number' ? responseData.score : undefined,
          totalQuestions: typeof responseData.totalQuestions === 'number' ? responseData.totalQuestions : undefined,
          percentageScore: responseData.percentageScore || undefined,
          minimumRequired: responseData.minimumRequired || undefined,
          message: responseData.message || 'No qualification data available',
          ...responseData
        };
        
        setQualification(qualData);
        return qualData;
      }
      return null;
    } catch (error) {
      handleError(error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, handleError]);

  // Function to start qualification attempt
  const startQualification = useCallback(async (): Promise<QualificationAttemptResponse> => {
    try {
      const response = await api.post('/quiz/start-qualification');
      const questions = response.data.questions ? normalizeQuestions(response.data.questions) : [];
      return {
        success: true,
        questions,
        attemptId: response.data.attemptId,
        ...response.data
      };
    } catch (error) {
      console.error('Failed to start qualification:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to start qualification'
      };
    }
  }, [normalizeQuestions]);
  
  // Handle quiz completion
  const handleQuizComplete = useCallback(async (score: number, answers: { questionId: string; answer: string }[]) => {
    try {
      setLoading(true);
      await api.post('/quiz/submit', { score, answers });
      await fetchQualification();
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  }, [fetchQualification, handleError]);

  // Fetch qualification status on mount and when auth state changes
  useEffect(() => {
    if (!authLoading && user) {
      fetchQualification().then((qualData) => {
        if (qualData?.hasAttempted) {
          setShowStatusDialog(true);
        }
      });
    } else if (!authLoading && !user) {
      setLoading(false);
    }
  }, [authLoading, user, fetchQualification]);

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
                      <CircularProgress />
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
                          onClick={async () => {
                            try {
                              setLoading(true);
                              const qualificationData = await startQualification();
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
                      )}
                      
                      {qualification?.hasAttempted && qualification.isQualified && (
                        <Button 
                          variant="contained" 
                          color="primary"
                          onClick={() => fetchQualification()}
                          sx={{ mt: 2, mr: 2 }}
                        >
                          Continue to Main Quiz
                        </Button>
                      )}
                    </Box>
                  )}
                  
                  {/* Status Dialog */}
                  <Dialog
                    open={showStatusDialog && !!qualification?.hasAttempted}
                    onClose={() => setShowStatusDialog(false)}
                    aria-labelledby="qualification-status-dialog"
                  >
                    <DialogTitle id="qualification-status-dialog">
                      {qualification?.isQualified ? '🎉 Qualification Passed!' : '⚠️ Qualification Status'}
                    </DialogTitle>
                    <DialogContent>
                      <DialogContentText component="div">
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
                              Qualification Attempted
                            </Typography>
                            <Typography variant="body1" paragraph>
                              You have already attempted the qualification quiz.
                            </Typography>
                          </>
                        )}
                        
                        {qualification?.score !== undefined && qualification?.totalQuestions && (
                          <Box mt={2} mb={2}>
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
                        
                        <Typography variant="body2" color="text.secondary">
                          {qualification?.message || 
                            (qualification?.isQualified 
                              ? 'You can now participate in the main quiz.' 
                              : 'If you believe this is an error, please contact support.')}
                        </Typography>
                      </DialogContentText>
                    </DialogContent>
                    <DialogActions>
                      <Button onClick={() => setShowStatusDialog(false)} color="primary">
                        {qualification?.isQualified ? 'Continue to Quiz' : 'Close'}
                      </Button>
                      {!qualification?.isQualified && (
                        <Button 
                          onClick={() => navigate('/leaderboard')} 
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
