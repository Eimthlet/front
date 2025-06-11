import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Typography, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, Card, CardContent } from '@mui/material';
import api from '../utils/apiClient';
import { useAuth } from '../contexts/AuthContext';
import Quiz from './Quiz';

interface QualificationRound {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  minimumScorePercentage: number;
}

interface QualificationCheckResponse {
  needsQualification: boolean;
  hasPassed: boolean;
  hasAttempted?: boolean;
  qualificationRound?: QualificationRound;
  lastAttempt?: string;
  message?: string;
  canProceed?: boolean;
}

const QualificationCheck: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [needsQualification, setNeedsQualification] = useState(false);
  const [hasPassed, setHasPassed] = useState(false);
  const [hasAttempted, setHasAttempted] = useState(false);
  const [qualificationRound, setQualificationRound] = useState<QualificationRound | null>(null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const checkQualification = async () => {
      try {
        setLoading(true);
        const response = await api.get<QualificationCheckResponse>('/api/quiz/check-qualification');
        
        setNeedsQualification(response.data.needsQualification);
        setHasPassed(response.data.hasPassed);
        setHasAttempted(response.data.hasAttempted || false);
        setQualificationRound(response.data.qualificationRound || null);
        
        // If no qualification needed or already passed, show children
        if (!response.data.needsQualification || response.data.hasPassed) {
          setShowQuiz(false);
        } else if (response.data.canProceed) {
          // If no active qualification round, allow proceeding
          setShowQuiz(true);
        }
      } catch (err: any) {
        console.error('Error checking qualification status:', err);
        setError('Failed to check qualification status. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      checkQualification();
    }
  }, [user]);

  const handleStartQualification = () => {
    setShowQuiz(true);
  };

  const handleQuizComplete = (result: any) => {
    if (result.passed) {
      // Refresh the check to update the UI
      setNeedsQualification(false);
      setHasPassed(true);
    } else {
      setHasAttempted(true);
    }
    setShowQuiz(false);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }


  if (showQuiz && qualificationRound) {
    return (
      <Quiz 
        questions={[]} // This will be loaded by the Quiz component
        onComplete={handleQuizComplete}
        isQualificationRound={true}
        qualificationRoundId={qualificationRound.id}
        minimumScorePercentage={qualificationRound.minimumScorePercentage}
      />
    );
  }

  if (needsQualification && !hasPassed) {
    return (
      <Box maxWidth="md" mx="auto" p={3}>
        <Card>
          <CardContent>
            <Typography variant="h5" component="h2" gutterBottom>
              Qualification Required
            </Typography>
            
            {hasAttempted ? (
              <>
                <Typography color="error" paragraph>
                  You did not meet the qualification requirements in your previous attempt.
                </Typography>
                <Typography paragraph>
                  Please try again when you're ready. You need to score at least {qualificationRound?.minimumScorePercentage}% to qualify.
                </Typography>
              </>
            ) : (
              <Typography paragraph>
                Before you can participate in the main quiz, you need to complete a qualification round.
                You'll need to score at least {qualificationRound?.minimumScorePercentage}% to qualify.
              </Typography>
            )}
            
            <Button 
              variant="contained" 
              color="primary" 
              onClick={handleStartQualification}
              sx={{ mt: 2 }}
            >
              {hasAttempted ? 'Try Again' : 'Start Qualification'}
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  // If no qualification needed or already passed, render children
  return <>{children}</>;
};

export default QualificationCheck;
