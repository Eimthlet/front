import React from 'react';
import { Paper, Typography, Box, Button, styled } from '@mui/material';

const GlassCard = styled(Box)(({ theme }) => ({
  background: 'rgba(45, 50, 90, 0.85)',
  backdropFilter: 'blur(10px)',
  borderRadius: theme.spacing(3),
  padding: theme.spacing(4),
  color: '#fff',
  boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
  border: '1px solid rgba(255, 255, 255, 0.18)',
}));

const StyledOption = styled(Paper)<{ selected?: boolean }>(({ theme, selected }) => ({
  background: selected ? 'rgba(67, 206, 162, 0.9)' : 'rgba(255, 255, 255, 0.1)',
  color: selected ? '#fff' : '#fff',
  backdropFilter: 'blur(5px)',
  borderRadius: theme.spacing(2),
  padding: theme.spacing(2),
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  border: `1px solid ${selected ? '#43cea2' : 'rgba(255, 255, 255, 0.2)'}`,
  '&:hover': {
    background: selected ? 'rgba(67, 206, 162, 0.9)' : 'rgba(255, 255, 255, 0.2)',
    transform: 'translateY(-2px)',
  }
}));

interface Option {
  id: string;
  text: string;
  icon?: string;
}

interface QuestionCardProps {
  currentStep: number;
  totalSteps: number;
  question: string;
  options: Option[];
  selectedOption?: string;
  onSelect: (id: string) => void;
  onNext: () => void;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  currentStep,
  totalSteps,
  question,
  options,
  selectedOption,
  onSelect,
  onNext,
}) => {
  return (
    <Box className="min-h-screen p-4" sx={{ background: 'linear-gradient(135deg, #1a1f2e 0%, #2d325a 100%)' }}>
      <Box className="max-w-md mx-auto">
        <GlassCard>
          <Box className="mb-8">
            <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 2 }}>
              Question {currentStep} of {totalSteps}
            </Typography>
            <Box sx={{ width: '100%', height: '4px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '2px' }}>
              <Box
                sx={{
                  height: '100%',
                  background: 'linear-gradient(90deg, #43cea2 0%, #185a9d 100%)',
                  borderRadius: '2px',
                  width: `${(currentStep / totalSteps) * 100}%`,
                  transition: 'width 0.3s ease'
                }}
              />
            </Box>
          </Box>

          <Typography variant="h5" sx={{ mb: 4, color: '#fff', fontWeight: 600 }}>
            {question}
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 4 }}>
            {options.map((option) => (
              <StyledOption
                key={option.id}
                selected={selectedOption === option.id}
                onClick={() => onSelect(option.id)}
              >
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  {option.icon && (
                    <Box component="span" sx={{ mr: 2, fontSize: '1.5rem' }}>
                      {option.icon}
                    </Box>
                  )}
                  <Typography sx={{ fontSize: '1.1rem' }}>{option.text}</Typography>
                </Box>
              </StyledOption>
            ))}
          </Box>

          <Button
            variant="contained"
            fullWidth
            disabled={!selectedOption}
            onClick={onNext}
            sx={{
              background: 'linear-gradient(90deg, #43cea2 0%, #185a9d 100%)',
              color: '#fff',
              py: 1.5,
              fontSize: '1.1rem',
              fontWeight: 600,
              '&:hover': {
                background: 'linear-gradient(90deg, #185a9d 0%, #43cea2 100%)',
              },
              '&.Mui-disabled': {
                background: 'rgba(255, 255, 255, 0.1)',
                color: 'rgba(255, 255, 255, 0.3)'
              }
            }}
          >
            Next
          </Button>
        </GlassCard>
      </Box>
    </Box>
  );
};
