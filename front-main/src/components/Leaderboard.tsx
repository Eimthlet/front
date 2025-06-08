import React, { useState, useEffect, useCallback } from 'react';
import { Typography, ToggleButton, ToggleButtonGroup, Box, CircularProgress } from '@mui/material';
import { styled } from '@mui/material/styles';
import { motion, AnimatePresence } from 'framer-motion';
import apiClient from '../utils/apiClient';

interface LeaderboardEntry {
  user_id: number;
  username: string;
  score: number;
  completed_at: string;
  questions_answered: string;
  total_questions: string;
}

interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[];
  userRank: number | null;
  currentUserId: number;
}

const StyledToggleButton = styled(ToggleButton)(({ theme }) => ({
  '&.MuiToggleButton-root': {
    color: 'rgba(255, 255, 255, 0.6)',
    border: 'none',
    padding: '8px 16px',
    '&.Mui-selected': {
      color: '#ffffff',
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    '&:hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.15)',
    },
  },
}));

const LeaderboardCard = styled(Box)(({ theme }) => ({
  background: 'rgba(18, 18, 18, 0.8)',
  backdropFilter: 'blur(10px)',
  borderRadius: theme.spacing(2),
  padding: theme.spacing(2.5),
  marginBottom: theme.spacing(2),
  border: '1px solid rgba(255, 255, 255, 0.1)',
  transition: 'transform 0.2s ease-in-out',
  '&:hover': {
    transform: 'translateY(-2px)',
  }
}));

const Leaderboard: React.FC = () => {
  const [timeRange, setTimeRange] = useState<'monthly' | 'all-time'>('monthly');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch leaderboard data
      const response = await apiClient.get<LeaderboardResponse>('/leaderboard');
      
      if (response && Array.isArray(response.leaderboard)) {
        setLeaderboard(response.leaderboard);
      } else {
        console.warn('Unexpected leaderboard response format:', response);
        setLeaderboard([]);
      }
    } catch (err: any) {
      console.error('Error fetching leaderboard:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load leaderboard data');
      setLeaderboard([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress sx={{ color: 'rgba(255, 255, 255, 0.7)' }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="h6" sx={{ color: '#ff6b6b', mb: 2 }}>
          {error}
        </Typography>
        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
          Please try again later
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'stretch', sm: 'center' }, 
        justifyContent: 'space-between',
        gap: 2,
        mb: 4 
      }}>
        <Typography variant="h4" sx={{ 
          color: '#fff',
          fontWeight: 600,
          textAlign: { xs: 'center', sm: 'left' }
        }}>
          Leaderboard
        </Typography>
        <ToggleButtonGroup
          value={timeRange}
          exclusive
          onChange={(_, value) => value && setTimeRange(value)}
          sx={{ 
            bgcolor: 'rgba(18, 18, 18, 0.8)',
            borderRadius: 2,
            p: 0.5,
            alignSelf: { xs: 'center', sm: 'auto' }
          }}
        >
          <StyledToggleButton value="monthly">
            MONTHLY
          </StyledToggleButton>
          <StyledToggleButton value="all-time">
            ALL-TIME
          </StyledToggleButton>
        </ToggleButtonGroup>
      </Box>

      <AnimatePresence>
        {leaderboard.map((entry, index) => (
          <motion.div
            key={entry.user_id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <LeaderboardCard>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center',
                gap: { xs: 2, sm: 3 }
              }}>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 700,
                    color: '#fff',
                    opacity: 0.9,
                    minWidth: { xs: '30px', sm: '40px' }
                  }}
                >
                  #{index + 1}
                </Typography>
                
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" sx={{ 
                    fontWeight: 600,
                    color: '#fff',
                    mb: 0.5
                  }}>
                    {entry.username}
                  </Typography>
                  {/* No additional text under username */}
                </Box>

                <Box sx={{ textAlign: 'right' }}>
                  <Typography
                    variant="h5"
                    sx={{ 
                      fontWeight: 700,
                      color: '#fff',
                      mb: 0.5
                    }}
                  >
                    {entry.score}
                  </Typography>
                  <Typography sx={{ 
                    color: 'rgba(255, 255, 255, 0.6)',
                    fontSize: '0.8rem',
                    letterSpacing: 1
                  }}>
                    POINTS
                  </Typography>
                </Box>
              </Box>
            </LeaderboardCard>
          </motion.div>
        ))}
      </AnimatePresence>
    </Box>
  );
};

export default Leaderboard;
