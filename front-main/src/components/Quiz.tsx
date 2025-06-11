import React, { FC, useState, useMemo, useEffect, useCallback } from 'react';
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
  questions: initialQuestions = [], 
  onComplete, 
  isQualificationRound = false, 
  qualificationRoundId,
  minimumScorePercentage = 70
}) => {
  // State hooks
  const [questions, setQuestions] = useState<Question[]>(initialQuestions);
  const [isLoading, setIsLoading] = useState<boolean>(isQualificationRound && initialQuestions.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState<boolean>(false);
  const [showResult, setShowResult] = useState<boolean>(false);
  const [showTerms, setShowTerms] = useState<boolean>(true);
  const [quizResult, setQuizResult] = useState<{
    score: number;
    percentageScore: number;
    passed: boolean;
  } | null>(null);

  // Hooks
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
        if (response.questions) {
          setQuestions(response.questions.map((q: any) => ({
            id: q.id,
            question: q.question,
            options: q.options,
            correctAnswer: q.correctAnswer,
            timeLimit: q.timeLimit || 30
          })));
          setAttemptId(response.attemptId);
        }
      } catch (err: any) {
        console.error('Failed to load qualification questions:', err);
        setError('Failed to load qualification questions. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    if (isQualificationRound && initialQuestions.length === 0) {
      loadQualificationQuestions();
    }
  }, [isQualificationRound, qualificationRoundId, initialQuestions.length]);

  // Quiz completion is handled in the handleAnswer function

  // Handle terms acceptance
  const handleAcceptTerms = useCallback(() => {
    setHasAcceptedTerms(true);
    setShowTerms(false);
  }, []);

  // Validate and prepare questions
  const validQuestions = useMemo(() => 
    questions.filter((q): q is Question => 
      Boolean(q) && 
      Boolean(q.id) && 
      Boolean(q.question) && 
      Array.isArray(q.options) && 
      q.options.length > 0 && 
      typeof q.correctAnswer !== 'undefined'
    ), 
    [questions]
  );

  // Session management
  const session = useMemo(() => loadQuizSession(), []);

  const shuffledQuestions = useMemo(() => {
    if (validQuestions.length === 0 || !user) {
      return [];
    }

    if (session?.shuffledOrder?.length === validQuestions.length) {
      const idToQuestion = Object.fromEntries(validQuestions.map(q => [q.id, q]));
      return session.shuffledOrder
        .map((id: string) => idToQuestion[id])
        .filter((q): q is Question => q !== undefined);
    }
    
    const shuffled = [...validQuestions].sort(() => Math.random() - 0.5);
    const order = shuffled.map(q => q.id);
    saveQuizSession({ 
      ...session, 
      shuffledOrder: order 
    });
    
    return shuffled;
  }, [validQuestions, session, user]);

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

    if (session?.quizState && session.shuffledOrder?.length === shuffledQuestions.length) {
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

  // Handle answer selection
  const handleAnswerSelect = useCallback((questionId: string, selectedAnswer: string) => {
    setQuizState(prev => {
      const currentQuestion = shuffledQuestions[prev.currentQuestion];
      if (!currentQuestion) return prev;
      
      const isCorrect = selectedAnswer === currentQuestion.correctAnswer;
      const newScore = isCorrect ? prev.score + 1 : prev.score;
      const newAnswers = {
        ...prev.answers,
        [questionId]: selectedAnswer
      };
      
      // Save progress
      const newState = {
        ...prev,
        score: newScore,
        answers: newAnswers
      };
      
      // Move to next question or complete quiz
      if (prev.currentQuestion < shuffledQuestions.length - 1) {
        newState.currentQuestion = prev.currentQuestion + 1;
        newState.timeRemaining = shuffledQuestions[prev.currentQuestion + 1]?.timeLimit || 30;
      } else {
        newState.isComplete = true;
        // Convert answers to array format for onComplete
        const answersArray = Object.entries(newAnswers).map(([qId, answer]) => ({
          questionId: qId,
          answer
        }));
        
        const percentageScore = (newScore / shuffledQuestions.length) * 100;
        const passed = percentageScore >= (minimumScorePercentage || 70);
        
        onComplete({
          score: newScore,
          answers: answersArray,
          percentageScore,
          passed
        });
        
        setShowResult(true);
      }
      
      // Save session
      saveQuizSession({
        ...session,
        quizState: newState,
        shuffledOrder: shuffledQuestions.map(q => q.id)
      });
      
      return newState;
    });
  }, [shuffledQuestions, minimumScorePercentage, onComplete, session]);

  // Timer effect
  useEffect(() => {
    if (validQuestions.length === 0 || !user || quizState.isComplete) return;
    
    const timer = setInterval(() => {
      setQuizState(prev => {
        if (prev.timeRemaining <= 1) {
          // Time's up, move to next question or complete
          if (prev.currentQuestion < shuffledQuestions.length - 1) {
            const newState = {
              ...prev,
              currentQuestion: prev.currentQuestion + 1,
              timeRemaining: shuffledQuestions[prev.currentQuestion + 1]?.timeLimit || 30
            };
            
            saveQuizSession({
              ...session,
              quizState: newState,
              shuffledOrder: shuffledQuestions.map(q => q.id)
            });
            
            return newState;
          } else {
            // Quiz complete
            const answersArray = Object.entries(prev.answers).map(([qId, answer]) => ({
              questionId: qId,
              answer
            }));
            
            const percentageScore = (prev.score / shuffledQuestions.length) * 100;
            const passed = percentageScore >= (minimumScorePercentage || 70);
            
            onComplete({
              score: prev.score,
              answers: answersArray,
              percentageScore,
              passed
            });
            
            const completedState = {
              ...prev,
              isComplete: true,
              timeRemaining: 0
            };
            
            saveQuizSession({
              ...session,
              quizState: completedState,
              shuffledOrder: shuffledQuestions.map(q => q.id)
            });
            
            setShowResult(true);
            return completedState;
          }
        }
        
        return { ...prev, timeRemaining: prev.timeRemaining - 1 };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [validQuestions.length, user, quizState.isComplete, shuffledQuestions, onComplete, minimumScorePercentage, session]);

  // Check if user is qualified
  const [hasQualification, setHasQualification] = useState<boolean | null>(null);
  
  useEffect(() => {
    const checkQualification = async () => {
      if (!user) return;
      
      try {
        const response = await api.get<{
          hasAttempted: boolean;
          isQualified?: boolean;
          qualifies_for_next_round?: boolean;
          message?: string;
        }>('/api/qualification');
        
        // Handle both response formats
        const isQualified = response.isQualified || response.qualifies_for_next_round || false;
        setHasQualification(isQualified);
        
        if (response.message) {
          console.log('Qualification check:', response.message);
        }
      } catch (err) {
        console.error('Failed to check qualification status:', handleApiError(err));
        setHasQualification(false);
      }
    };
    
    checkQualification();
  }, [user]);

  // Loading state
  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading questions...</Typography>
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  // Check if user needs to accept terms
  if (showTerms && !hasAcceptedTerms) {
    return (
      <GlassDialog>
        <DialogTitle>Quiz Terms and Conditions</DialogTitle>
        <DialogContent>
          <Typography variant="body1" paragraph>
            Before starting the quiz, please read and accept the terms and conditions:
          </Typography>
          <Typography variant="body2" color="textSecondary" paragraph>
            - You will have a limited time to answer each question
          </Typography>
          <Typography variant="body2" color="textSecondary" paragraph>
            - Once submitted, answers cannot be changed
          </Typography>
          <Typography variant="body2" color="textSecondary">
            - Your progress will be saved automatically
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => navigate('/')} 
            color="secondary"
            className="decline"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleAcceptTerms} 
            color="primary"
            variant="contained"
            className="accept"
          >
            I Accept
          </Button>
        </DialogActions>
      </GlassDialog>
    );
  }

  // Check if user needs to complete qualification
  if (isQualificationRound && hasQualification === false) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <GlassCard>
          <Typography variant="h5" gutterBottom>Qualification Required</Typography>
          <Typography variant="body1" paragraph>
            You need to complete the qualification round before attempting this quiz.
          </Typography>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={() => navigate('/qualification')}
          >
            Go to Qualification
          </Button>
        </GlassCard>
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

  // Show quiz results if completed
  if (quizState.isComplete || showResult) {
    const percentageScore = (quizState.score / questions.length) * 100;
    const passed = percentageScore >= (minimumScorePercentage || 70);
    
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <GlassCard>
          <Typography variant="h4" gutterBottom>
            {passed ? '🎉 Quiz Completed! 🎉' : 'Quiz Completed'}
          </Typography>
          <Typography variant="h6" gutterBottom>
            Your Score: {quizState.score} / {questions.length}
          </Typography>
          <Typography variant="h6" color={passed ? 'success.main' : 'error.main'} gutterBottom>
            {percentageScore.toFixed(1)}% - {passed ? 'Passed!' : 'Not Passed'}
          </Typography>
          <Box mt={4}>
            <Button 
              variant="contained" 
              color="primary" 
              onClick={() => {
                clearQuizSession();
                window.location.reload();
              }}
            >
              Restart Quiz
            </Button>
          </Box>
        </GlassCard>
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
    if (!currentQuestion) return;
    
    const isCorrect = selectedAnswer === currentQuestion.correctAnswer;

    setQuizState(prevState => {
      const newState: QuizState = {
        ...prevState,
        answers: {
          ...prevState.answers,
          [currentQuestion.id]: selectedAnswer
        },
        score: isCorrect ? prevState.score + 1 : prevState.score
      };

      // Move to next question or complete quiz
      if (prevState.currentQuestion + 1 < shuffledQuestions.length) {
        newState.currentQuestion += 1;
        newState.timeRemaining = shuffledQuestions[newState.currentQuestion]?.timeLimit || 30;
      } else {
        newState.isComplete = true;
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
      
      return newState;
    });
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
};

export default Quiz;