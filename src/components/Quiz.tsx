import React, { FC, useState, useMemo, useEffect } from 'react';
import { 
  Box, 
  Button, 
  Typography, 
  Card, 
  CardContent,
  styled
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
  onComplete: (score: number) => void;
}

const Quiz: FC<QuizProps> = ({ questions, onComplete }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // State hooks must be called first, before any early returns
  const [showTerms, setShowTerms] = useState(true);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showResult, setShowResult] = useState(false);

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
            onComplete(prev.score);
            return { ...prev, isComplete: true };
          }
        });
      }, 1000);

      return () => clearInterval(timer);
    }
    
    // No-op return if conditions aren't met
    return () => {};
  }, [onComplete, shuffledQuestions, validQuestions.length, user]);

  // Early return if no valid questions or no user
  if (validQuestions.length === 0 || !user) {
    return null;
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
      onComplete(newState.score);
    }
  };

  const handleAcceptTerms = () => {
    setAcceptedTerms(true);
    setShowTerms(false);
  };

  const handleDeclineTerms = () => {
    navigate('/leaderboard');
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
            justifyContent: 'flex-end', 
            gap: 2,
            mt: 4 
          }}>
            <ActionButton 
              className="decline" 
              onClick={handleDeclineTerms}
            >
              Decline
            </ActionButton>
            <ActionButton 
              className="accept"
              onClick={handleAcceptTerms}
            >
              Accept
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
                    onComplete(quizState.score);
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