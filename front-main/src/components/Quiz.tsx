import React, { FC, useState, useMemo, useEffect } from 'react';
import { 
  Box, 
  Button, 
  Typography, 
  Card, 
  CardContent,
  styled,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import AccessAlarmIcon from '@mui/icons-material/AccessAlarm';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../contexts/AuthContext';
import { 
  saveQuizSession, 
  loadQuizSession,
  clearQuizSession
} from '../utils/session';
import api from '../utils/apiClient'; 
import { handleApiError } from '../utils/apiErrorHandler'; 

// Types for Quiz component
export interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  timeLimit?: number;
}

export interface QuizState {
  currentQuestion: number;
  score: number;
  answers: Record<string, string>;
  timeRemaining: number;
  isComplete: boolean;
}

// Styled components
const GlassCard = styled(Card)(({ theme }) => ({
  background: 'rgba(18, 18, 18, 0.8)',
  color: '#fff',
  borderRadius: theme.spacing(2),
  backdropFilter: 'blur(10px)',
  boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  padding: theme.spacing(3, 2),
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(2, 1),
  },
}));

const GlassDialog = styled(Box)(({ theme }) => ({
  background: 'rgba(18, 18, 18, 0.8)',
  backdropFilter: 'blur(10px)',
  borderRadius: theme.spacing(2),
  padding: theme.spacing(3),
  color: '#fff',
  boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  maxWidth: '500px',
  width: '90%',
  margin: '0 auto',
  [theme.breakpoints.up('sm')]: {
    padding: theme.spacing(4),
  }
}));

const ActionButton = styled(Button)(({ theme }) => ({
  padding: '12px 24px',
  borderRadius: theme.spacing(1),
  fontWeight: 500,
  textTransform: 'none',
  fontSize: '1rem',
  transition: 'all 0.2s ease',
  '&.accept': {
    background: 'rgba(255, 255, 255, 0.1)',
    color: '#fff',
    '&:hover': {
      background: 'rgba(255, 255, 255, 0.2)',
    }
  },
  '&.decline': {
    background: 'transparent',
    color: '#ff6b6b',
    '&:hover': {
      background: 'rgba(255, 107, 107, 0.1)',
    }
  }
}));

// Quiz Component Props
interface QuizProps {
  questions: Question[];
  onComplete: (result: { 
    score: number; 
    answers: { questionId: string; answer: string }[];
    passed?: boolean;
    percentageScore?: number;
  }) => void;
  isQualificationRound?: boolean;
  qualificationRoundId?: string;
  minimumScorePercentage?: number;
}

const Quiz: FC<QuizProps> = ({ 
  questions: initialQuestions, 
  onComplete, 
  isQualificationRound = false, 
  qualificationRoundId,
  minimumScorePercentage = 70
}) => {
  const [questions, setQuestions] = useState<Question[]>(initialQuestions);
  const [isLoading, setIsLoading] = useState(isQualificationRound && initialQuestions.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [quizResult, setQuizResult] = useState<{
    score: number;
    percentageScore: number;
    passed: boolean;
  } | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  // Load questions for qualification round if needed
  useEffect(() => {
    const loadQualificationQuestions = async () => {
      if (!isQualificationRound || !qualificationRoundId) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await api.post('/api/quiz/start-qualification');
        if (response.data.questions) {
          setQuestions(response.data.questions.map((q: any) => ({
            id: q.id,
            question: q.question,
            options: q.options,
            correctAnswer: q.correctAnswer,
            timeLimit: q.timeLimit || 30
          })));
          setAttemptId(response.data.attemptId);
        }
      } catch (err: any) {
        console.error('Failed to load qualification questions:', err);
        setError('Failed to load qualification questions. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    if (isQualificationRound && questions.length === 0) {
      loadQualificationQuestions();
    }
  }, [isQualificationRound, qualificationRoundId]);

  // Handle quiz completion
  const handleComplete = async (score: number, answers: { questionId: string; answer: string }[]) => {
    const percentageScore = (score / questions.length) * 100;
    const passed = percentageScore >= minimumScorePercentage;
    
    const result = {
      score,
      answers,
      percentageScore,
      passed
    };

    if (isQualificationRound && attemptId) {
      try {
        const response = await api.post('/api/quiz/submit', {
          attemptId,
          answers: answers.map(a => ({
            questionId: a.questionId,
            answer: a.answer
          }))
        });
        
        // Update with server response
        result.passed = response.data.passed;
        result.percentageScore = response.data.percentageScore;
      } catch (err) {
        console.error('Failed to submit qualification attempt:', err);
        // Continue with client-side result if submission fails
      }
    }
    
    const finalResult = {
      score: result.score,
      percentageScore: result.percentageScore,
      passed: result.passed
    };
    
    setQuizResult(finalResult);
    setShowResult(true);
    onComplete({
      score: result.score,
      answers: result.answers,
      percentageScore: result.percentageScore,
      passed: result.passed
    });
  };

  // Handle terms acceptance
  const handleAcceptTerms = () => {
    setHasAcceptedTerms(true);
  };
  // State hooks must be called first, before any early returns
  const [showTerms, setShowTerms] = useState(true);

  // Validate and prepare questions
  const validQuestions = useMemo(() => 
    questions.filter((q): q is Question => 
      Boolean(q) && 
      Boolean(q.id) && 
      Boolean(q.question) && 
      Array.isArray(q.options) && 
      q.options.length > 0 && 
      q.correctAnswer !== undefined
    ), [questions]
  );

  // Session management
  const session = loadQuizSession();

  const [shuffledQuestions] = useState<Question[]>(() => {
    if (validQuestions.length === 0 || !user) {
      return [];
    }

    if (session?.shuffledOrder && session.shuffledOrder.length === validQuestions.length) {
      const idToQuestion = Object.fromEntries(validQuestions.map(q => [q.id, q]));
      return session.shuffledOrder
        .map((id: string) => idToQuestion[id])
        .filter(Boolean);
    }
    
    const shuffled = [...validQuestions].sort(() => Math.random() - 0.5);
    const order = shuffled.map(q => q.id);
    saveQuizSession({ shuffledOrder: order });
    return shuffled;
  });

  const [quizState, setQuizState] = useState<QuizState>(() => {
    if (validQuestions.length === 0 || !user) {
      return {
        currentQuestion: 0,
        score: 0,
        answers: {},
        timeRemaining: 0,
        isComplete: true
      };
    }

    if (session?.quizState && session.shuffledQuestions?.length === shuffledQuestions.length) {
      return session.quizState;
    }
    
    return {
      currentQuestion: 0,
      score: 0,
      answers: {},
      timeRemaining: shuffledQuestions[0]?.timeLimit || 30,
      isComplete: false,
    };
  });

  // Timer and session management hook (always called)
  useEffect(() => {
    // Only set up timer if there are valid questions and a user
    if (validQuestions.length > 0 && user) {
      const timer = setInterval(() => {
        setQuizState(prev => {
          if (prev.timeRemaining > 0) {
            return { ...prev, timeRemaining: prev.timeRemaining - 1 };
          }

          // Time's up, move to next question or complete quiz
          if (prev.currentQuestion + 1 < shuffledQuestions.length) {
            return {
              ...prev,
              currentQuestion: prev.currentQuestion + 1,
              timeRemaining: shuffledQuestions[prev.currentQuestion + 1]?.timeLimit || 30
            };
          } else {
            setShowResult(true);
            // Convert answers to the expected format
            const answers = Object.entries(prev.answers).map(([questionId, answer]) => ({
              questionId,
              answer
            }));
            const percentageScore = (prev.score / questions.length) * 100;
            const passed = percentageScore >= (minimumScorePercentage || 70);
            
            onComplete({
              score: prev.score,
              answers,
              percentageScore,
              passed
            });
            
            return { ...prev, isComplete: true };
          }
        });
      }, 1000);

      return () => clearInterval(timer);
    }
    
    // No-op return if conditions aren't met
    return () => {};
  }, [onComplete, shuffledQuestions, validQuestions.length, user]);

  // Qualification check
  const [hasQualification, setHasQualification] = useState<boolean | null>(null);

  useEffect(() => {
    const checkQualification = async () => {
      try {
        // The API client returns a response with data property
        const response = await api.get('/qualification');
        const qualificationData = response?.data;
        
        // Type guard to validate the response data structure
        if (!qualificationData || typeof qualificationData !== 'object') {
          console.error('Invalid response data:', qualificationData);
          throw new Error('Invalid response format from qualification endpoint');
        }
        
        // Check if the response has the expected properties
        const hasRequiredProps = 'hasAttempted' in qualificationData && 
                              ('isQualified' in qualificationData || 'qualifies_for_next_round' in qualificationData);
        
        if (!hasRequiredProps) {
          console.error('Unexpected response format:', qualificationData);
          throw new Error('Invalid qualification data format from server');
        }
        
        // Handle both response formats for the qualified flag
        const isQualified = qualificationData.isQualified || qualificationData.qualifies_for_next_round || false;
        setHasQualification(isQualified);
        
        if (!isQualified && qualificationData.message) {
          console.warn('Qualification check warning:', qualificationData.message);
        }
      } catch (err) {
        const error = handleApiError(err);
        console.error('Qualification check failed:', error);
        setHasQualification(false);
      }
    };

    if (user) {
      checkQualification();
    }
  }, [user]);

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading questions...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  // Handle loading and error states
  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading questions...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  // If there are no valid questions, show an error
  if (questions.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <Typography color="error">
          No valid questions available for this quiz.
        </Typography>
      </Box>
    );
  }

  // Show terms dialog if not accepted yet
  if (!hasAcceptedTerms) {
    return (
      <Dialog open={true} maxWidth="sm" fullWidth>
        <DialogTitle>Quiz Terms and Conditions</DialogTitle>
        <DialogContent>
          <Typography variant="body1" paragraph>
            By starting this {isQualificationRound ? 'qualification ' : ''}quiz, you agree to the following:
          </Typography>
          <ul>
            <li>You will answer all questions to the best of your ability</li>
            {isQualificationRound && (
              <li>
                You must score at least {minimumScorePercentage}% to pass the qualification round
              </li>
            )}
            <li>You will not use any external resources or assistance</li>
            <li>Your answers will be recorded for evaluation</li>
          </ul>
          {isQualificationRound && (
            <Typography variant="body2" color="primary" sx={{ mt: 2, fontWeight: 'bold' }}>
              Note: You must pass this qualification round to participate in the main quiz.
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button onClick={() => navigate('/')} color="secondary">
            Cancel
          </Button>
          <Button 
            onClick={handleAcceptTerms} 
            variant="contained" 
            color="primary"
          >
            I Accept
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  // Show quiz result if completed
  if (showResult && quizResult) {
    return (
      <Box textAlign="center" p={4}>
        <Typography variant="h4" gutterBottom>
          {isQualificationRound ? 'Qualification ' : 'Quiz '} Complete!
        </Typography>
        <Typography variant="h6" color={quizResult.passed ? 'success.main' : 'error.main'} gutterBottom>
          {quizResult.passed ? 'Congratulations! You passed!' : 'Sorry, you did not pass.'}
        </Typography>
        <Typography variant="body1" paragraph>
          Your score: {quizResult.score} out of {questions.length} (
          {quizResult.percentageScore.toFixed(1)}%)
        </Typography>
        {isQualificationRound && (
<Typography variant="body1" paragraph>
            {quizResult.passed 
              ? 'You have qualified to participate in the main quiz.' 
              : `You needed at least ${minimumScorePercentage}% to pass.`}
          </Typography>
        )}
        <Button 
          variant="contained" 
          color="primary" 
          onClick={() => {
            if (isQualificationRound && !quizResult.passed) {
              window.location.reload(); // Reload to retry
            } else {
              navigate('/');
            }
          }}
          sx={{ mt: 2 }}
        >
          {isQualificationRound && !quizResult.passed ? 'Try Again' : 'Return to Home'}
        </Button>
      </Box>
    );
  }

  if (hasQualification === null) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Typography variant="h6">Checking qualification status...</Typography>
      </Box>
    );
  }

  if (hasQualification === false) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Typography variant="h6" color="error">
          You don't qualify for this quiz round yet.
        </Typography>
      </Box>
    );
  }

  // Answer handling
  const handleAnswer = (selectedAnswer: string): void => {
    const currentQuestion = shuffledQuestions[quizState.currentQuestion];
    const isCorrect = selectedAnswer === currentQuestion.correctAnswer;

    const newState: QuizState = {
      ...quizState,
      answers: {
        ...quizState.answers,
        [currentQuestion.id]: selectedAnswer
      },
      score: isCorrect ? quizState.score + 1 : quizState.score
    };

    // Move to next question or complete quiz
    if (quizState.currentQuestion + 1 < shuffledQuestions.length) {
      newState.currentQuestion += 1;
      newState.timeRemaining = shuffledQuestions[newState.currentQuestion]?.timeLimit || 30;
      setQuizState(newState);
    } else {
      newState.isComplete = true;
      setQuizState(newState);
      setShowResult(true);
      
      // Convert answers to the expected format
      const answers = Object.entries(newState.answers).map(([questionId, answer]) => ({
        questionId,
        answer
      }));
      const percentageScore = (newState.score / questions.length) * 100;
      const passed = percentageScore >= (minimumScorePercentage || 70);
      onComplete({
        score: newState.score,
        answers,
        percentageScore,
        passed
      });
    }
  };

  if (showTerms) {
    return (
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '100vh',
        px: 2
      }}>
        <GlassDialog>
          <Typography variant="h4" sx={{ 
            mb: 4,
            fontWeight: 600,
            color: '#fff'
          }}>
            Terms and Conditions
          </Typography>
          
          <Typography variant="h6" sx={{ 
            mb: 2,
            fontWeight: 600,
            color: '#fff'
          }}>
            Quiz Rules
          </Typography>
          <Box component="ul" sx={{ 
            mb: 4,
            pl: 2,
            listStyle: 'none',
            '& li': {
              position: 'relative',
              pl: 3,
              '&:before': {
                content: '"•"',
                position: 'absolute',
                left: 0,
                color: 'rgba(255, 255, 255, 0.5)'
              }
            }
          }}>
            <Typography component="li" sx={{ 
              mb: 2,
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: '0.95rem',
              lineHeight: 1.5
            }}>
              1. You must complete the quiz within the time limit for each question.
            </Typography>
            <Typography component="li" sx={{ 
              mb: 2,
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: '0.95rem',
              lineHeight: 1.5
            }}>
              2. You cannot skip questions or go back to previous questions.
            </Typography>
            <Typography component="li" sx={{ 
              mb: 2,
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: '0.95rem',
              lineHeight: 1.5
            }}>
              3. Your score will be recorded on the leaderboard.
            </Typography>
            <Typography component="li" sx={{ 
              mb: 2,
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: '0.95rem',
              lineHeight: 1.5
            }}>
              4. You can only take the quiz once per session.
            </Typography>
          </Box>

          <Typography variant="h6" sx={{ 
            mb: 2,
            fontWeight: 600,
            color: '#fff'
          }}>
            Disqualification Rules
          </Typography>
          <Box component="ul" sx={{ 
            mb: 4,
            pl: 2,
            listStyle: 'none',
            '& li': {
              position: 'relative',
              pl: 3,
              '&:before': {
                content: '"•"',
                position: 'absolute',
                left: 0,
                color: 'rgba(255, 255, 255, 0.5)'
              }
            }
          }}>
            <Typography component="li" sx={{ 
              mb: 2,
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: '0.95rem',
              lineHeight: 1.5
            }}>
              1. You will be disqualified if you take too long to answer a question.
            </Typography>
            <Typography component="li" sx={{ 
              mb: 2,
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: '0.95rem',
              lineHeight: 1.5
            }}>
              2. You will be disqualified if you try to navigate away from the quiz.
            </Typography>
            <Typography component="li" sx={{ 
              mb: 2,
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: '0.95rem',
              lineHeight: 1.5
            }}>
              3. You will be disqualified if you try to refresh the page during the quiz.
            </Typography>
          </Box>

          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            mt: 4 
          }}>
            <ActionButton 
              className="accept"
              onClick={() => setShowTerms(false)}
              variant="contained"
              color="primary"
              size="large"
            >
              Start Quiz
            </ActionButton>
          </Box>
        </GlassDialog>
      </Box>
    );
  }

  // Render quiz
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <AnimatePresence>
        {!showResult ? (
          <motion.div
            key="quiz-active"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <GlassCard>
              <CardContent>
                <Typography variant="h5" gutterBottom sx={{ color: '#fff', fontWeight: 500 }}>
                  {shuffledQuestions[quizState.currentQuestion].question}
                </Typography>
                <Box display="flex" alignItems="center" mb={3}>
                  <AccessAlarmIcon sx={{ color: 'rgba(255, 255, 255, 0.7)' }} />
                  <Typography variant="body1" ml={1} sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                    {quizState.timeRemaining} seconds remaining
                  </Typography>
                </Box>
                {shuffledQuestions[quizState.currentQuestion].options.map((option: string, index: number) => (
                  <Button
                    key={`option-${index}`}
                    variant="contained"
                    fullWidth
                    sx={{
                      mb: 2,
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: '#fff',
                      '&:hover': {
                        background: 'rgba(255, 255, 255, 0.2)',
                      },
                      textTransform: 'none',
                      py: 1.5
                    }}
                    onClick={() => handleAnswer(option)}
                  >
                    {option}
                  </Button>
                ))}
              </CardContent>
            </GlassCard>
          </motion.div>
        ) : (
          <motion.div
            key="quiz-result"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <GlassCard>
              <CardContent>
                <Typography variant="h4">Quiz Complete!</Typography>
                <Typography variant="h6">
                  Your Score: {quizState.score} / {shuffledQuestions.length}
                </Typography>
                <Button
                  variant="contained"
                  onClick={() => {
                    clearQuizSession();
                    // Convert answers to the expected format
                    const answers = Object.entries(quizState.answers).map(([questionId, answer]) => ({
                      questionId,
                      answer
                    }));
                    const percentageScore = (quizState.score / questions.length) * 100;
                    const passed = percentageScore >= (minimumScorePercentage || 70);
                    onComplete({
                      score: quizState.score,
                      answers,
                      percentageScore,
                      passed
                    });
                    navigate('/leaderboard');
                  }}
                >
                  View Leaderboard
                </Button>
              </CardContent>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <Box sx={{
          bgcolor: 'rgba(253,45,157,0.10)',
          px: 3,
          py: 1.2,
          borderRadius: 2,
          boxShadow: '0 2px 10px 0 rgba(253,45,157,0.13)',
        }}>
          <Typography variant="h6" sx={{ color: '#fd2d9d', fontWeight: 700 }}>
            Score: {quizState.score}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

export default Quiz;