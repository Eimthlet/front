import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Switch,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Tabs,
  Tab,
  CircularProgress,
  IconButton,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PeopleIcon from '@mui/icons-material/People';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import api from '../utils/api';

// TypeScript interfaces
interface Season {
  id: number | string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  is_qualification_round: boolean;
  minimum_score_percentage: number;
  description?: string;
  question_count: number;
  attempts_count: number;
  qualified_users_count: number;
  created_at: string;
  updated_at: string;
}

interface Question {
  id?: number | string;
  question_text: string;
  options: string[];
  correct_answer: string;
  season_id?: number | string;
}

interface QualifiedUser {
  id: number | string;
  username: string;
  email: string;
  score: number;
  percentage_score: number;
  completed_at: string;
}

interface ApiResponse<T> {
  data: T;
  message?: string;
  success?: boolean;
}

interface ApiError extends Error {
  response?: {
    data?: {
      message?: string;
      error?: string;
    };
    status?: number;
  };
  config?: {
    url?: string;
    method?: string;
  };
}

interface SeasonManagerProps {}

// Utility function to format dates
const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

const SeasonManager: React.FC<SeasonManagerProps> = () => {
  // Consolidated state management
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [currentSeason, setCurrentSeason] = useState<Partial<Season>>({
    name: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    is_active: false,
    is_qualification_round: false,
    minimum_score_percentage: 50
  });
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [openDialog, setOpenDialog] = useState(false);
  const [openQuestionsDialog, setOpenQuestionsDialog] = useState(false);
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question>({
    question_text: '',
    options: ['', '', '', ''],
    correct_answer: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openQualifiedUsersDialog, setOpenQualifiedUsersDialog] = useState(false);
  const [qualifiedUsers, setQualifiedUsers] = useState<QualifiedUser[]>([]);
  const [tabValue, setTabValue] = useState(0);

  // Fetch seasons on component mount
  const fetchSeasons = useCallback(async () => {
    try {
      setLoading(true);
      // The response is already unwrapped by apiClient
      const seasonsData = await api.get<Season[] | ApiResponse<Season[]>>('/admin/seasons');
      
      // Handle both direct array response and wrapped response
      if (Array.isArray(seasonsData)) {
        setSeasons(seasonsData);
      } else if (seasonsData && 'data' in seasonsData && Array.isArray(seasonsData.data)) {
        setSeasons(seasonsData.data);
      } else {
        console.error('Unexpected API response format:', seasonsData);
        setError('Unexpected data format received from server');
        setSeasons([]);
      }
      setError(null);
    } catch (err: unknown) {
      console.error('Error fetching seasons:', err);
      const apiError = err as ApiError;
      const errorMessage = apiError.response?.data?.message || 
                         apiError.response?.data?.error || 
                         apiError.message || 
                         'Failed to fetch seasons';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);
  
  useEffect(() => {
    fetchSeasons();
  }, [fetchSeasons]);
  
  // Handle tab change
  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Dialog handlers
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setError(null);
  };

  const handleCloseQuestionsDialog = () => {
    setOpenQuestionsDialog(false);
    setCurrentQuestion({
      question_text: '',
      options: ['', '', '', ''],
      correct_answer: ''
    });
  };

  const handleCloseQualifiedUsersDialog = () => {
    setOpenQualifiedUsersDialog(false);
    setQualifiedUsers([]);
  };

  // Handle opening the dialog
  const handleOpenDialog = (mode: 'create' | 'edit', season?: Season) => {
    setDialogMode(mode);
    if (mode === 'edit' && season) {
      setCurrentSeason({
        ...season,
        start_date: season.start_date.split('T')[0],
        end_date: season.end_date.split('T')[0]
      });
    } else {
      setCurrentSeason({
        name: '',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        is_active: false,
        is_qualification_round: false,
        minimum_score_percentage: 50
      });
    }
    setOpenDialog(true);
  };

  // Handle opening the questions dialog
  const handleOpenQuestionsDialog = async (seasonId: number | string) => {
    const numSeasonId = Number(seasonId);
    setSelectedSeasonId(numSeasonId);
    setQuestions([]);
    setCurrentQuestion({
      question_text: '',
      options: ['', '', '', ''],
      correct_answer: ''
    });
    
    try {
      type QuestionsResponse = Question[] | ApiResponse<Question[]>;
      const response = await api.get<QuestionsResponse>(`/admin/seasons/${numSeasonId}/questions`);
      // Handle both direct array response and wrapped response
      const questions: Question[] = Array.isArray(response) 
        ? response 
        : 'data' in response && Array.isArray(response.data) 
          ? response.data 
          : [];
      setQuestions(questions);
      setOpenQuestionsDialog(true);
    } catch (err: unknown) {
      console.error('Error fetching season questions:', err);
      const apiError = err as ApiError;
      const errorMessage = apiError.response?.data?.message || 
                         apiError.response?.data?.error || 
                         apiError.message || 
                         'Failed to load questions';
      setError(errorMessage);
    }
  };

  // Handle opening qualified users dialog
  const handleOpenQualifiedUsersDialog = async (seasonId: number | string) => {
    const numSeasonId = Number(seasonId);
    setQualifiedUsers([]);
    
    try {
      type UsersResponse = QualifiedUser[] | ApiResponse<QualifiedUser[]>;
      const response = await api.get<UsersResponse>(`/admin/seasons/${numSeasonId}/qualified-users`);
      // Handle both direct array response and wrapped response
      const users: QualifiedUser[] = Array.isArray(response)
        ? response
        : 'data' in response && Array.isArray(response.data)
          ? response.data
          : [];
      setQualifiedUsers(users);
      setOpenQualifiedUsersDialog(true);
    } catch (err: unknown) {
      console.error('Error fetching qualified users:', err);
      const apiError = err as ApiError;
      const errorMessage = apiError.response?.data?.message || 
                         apiError.response?.data?.error || 
                         apiError.message || 
                         'Failed to load qualified users';
      setError(errorMessage);
    }
  };

  // Handle question form changes
  const handleQuestionChange = useCallback((field: keyof Question, value: string) => {
    setCurrentQuestion(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const handleOptionChange = useCallback((index: number, value: string) => {
    setCurrentQuestion(prev => ({
      ...prev,
      options: prev.options.map((option, i) => i === index ? value : option)
    }));
  }, []);

  const handleSubmitQuestions = useCallback(async () => {
    if (!selectedSeasonId) return;

    // Validate question data
    if (!currentQuestion.question_text.trim()) {
      setError('Question text is required');
      return;
    }
    
    if (currentQuestion.options.some(option => !option.trim())) {
      setError('All options must be filled');
      return;
    }
    
    if (!currentQuestion.correct_answer.trim()) {
      setError('Correct answer is required');
      return;
    }

    try {
      await api.post<ApiResponse<void>>(`/admin/seasons/${selectedSeasonId}/questions`, { questions: [currentQuestion] });
      const updatedQuestionsResponse = await api.get<Question[]>(`/seasons/${selectedSeasonId}/questions`);
      setQuestions(updatedQuestionsResponse.data);
      setCurrentQuestion({
        question_text: '',
        options: ['', '', '', ''],
        correct_answer: ''
      });
      setError(null);
    } catch (err: unknown) {
      console.error('Error submitting questions:', err);
      const apiError = err as ApiError;
      const errorMessage = apiError.response?.data?.message || 
                         apiError.response?.data?.error || 
                         apiError.message || 
                         'Failed to submit questions';
      setError(errorMessage);
    }
  }, [selectedSeasonId, currentQuestion]);

  // Handle season form changes
  const handleSeasonChange = useCallback((field: keyof Season, value: string | boolean | number) => {
    setCurrentSeason(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  // Handle season form submission
  const handleSubmitSeason = useCallback(async () => {
    if (!currentSeason) return;
    
    try {
      // Validate required fields
      if (!currentSeason.name?.trim()) {
        setError('Season name is required');
        return;
      }
      if (!currentSeason.start_date) {
        setError('Start date is required');
        return;
      }
      if (!currentSeason.end_date) {
        setError('End date is required');
        return;
      }

      // Prepare season data
      const seasonData: Omit<Season, 'id'> = {
        name: currentSeason.name,
        start_date: currentSeason.start_date,
        end_date: currentSeason.end_date,
        is_active: currentSeason.is_active || false,
        is_qualification_round: currentSeason.is_qualification_round || false,
        minimum_score_percentage: currentSeason.minimum_score_percentage || 50,
        description: currentSeason.description || '',
        question_count: currentSeason.question_count || 0,
        attempts_count: currentSeason.attempts_count || 0,
        qualified_users_count: currentSeason.qualified_users_count || 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log('Submitting season data:', JSON.stringify(seasonData, null, 2));
      
      if (dialogMode === 'create') {
        await api.post<ApiResponse<Season>>(`/admin/seasons`, seasonData);
      } else if (currentSeason.id) {
        await api.put<ApiResponse<Season>>(`/admin/seasons/${currentSeason.id}`, seasonData);
      } else {
        throw new Error('Cannot update season: No season ID provided');
      }
      
      // Refresh seasons
      await fetchSeasons();
      setOpenDialog(false);
      setError(null);
      
    } catch (err: unknown) {
      console.error('Error submitting season:', err);
      const apiError = err as ApiError;
      const errorMessage = apiError.response?.data?.message || 
                         apiError.response?.data?.error || 
                         apiError.message || 
                         'Failed to save season';
      setError(errorMessage);
    }
  }, [dialogMode, currentSeason, fetchSeasons]);

  // Handle season deletion
  const handleDeleteSeason = async (id: number | string) => {
    if (!window.confirm('Are you sure you want to delete this season? This action cannot be undone.')) {
      return;
    }
    
    try {
      setLoading(true);
      await api.delete<ApiResponse<void>>(`/admin/seasons/${Number(id)}`);
      await fetchSeasons();
      setError(null);
    } catch (err: unknown) {
      console.error('Error deleting season:', err);
      
      const apiError = err as ApiError;
      const errorMessage = apiError.response?.data?.message || 
                         apiError.response?.data?.error || 
                         apiError.message || 
                         'Failed to delete season';
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Filter seasons based on tab selection
  const getFilteredSeasons = () => {
    if (!Array.isArray(seasons)) return [];
    
    switch (tabValue) {
      case 1: // Active Seasons
        return seasons.filter(season => season.is_active);
      case 2: // Qualification Rounds
        return seasons.filter(season => season.is_qualification_round);
      default: // All Seasons
        return seasons;
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Season Manager
        </Typography>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog('create')}
        >
          Create Season
        </Button>
      </Box>
      
      {error && (
        <Box sx={{ mb: 2, p: 2, bgcolor: 'error.light', borderRadius: 1 }}>
          <Typography color="error">{error}</Typography>
        </Box>
      )}
      
      <Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: 2 }}>
        <Tab label="All Seasons" />
        <Tab label="Active Seasons" />
        <Tab label="Qualification Rounds" />
      </Tabs>
      
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Period</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Questions</TableCell>
              <TableCell>Attempts</TableCell>
              <TableCell>Qualified Users</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {getFilteredSeasons().map(season => (
              <TableRow key={season.id}>
                <TableCell>{season.name}</TableCell>
                <TableCell>{season.start_date} - {season.end_date}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {season.is_active && (
                      <Typography variant="caption" sx={{ bgcolor: 'success.light', px: 1, borderRadius: 1 }}>
                        Active
                      </Typography>
                    )}
                    {season.is_qualification_round && (
                      <Typography variant="caption" sx={{ bgcolor: 'info.light', px: 1, borderRadius: 1 }}>
                        Qualification
                      </Typography>
                    )}
                    {!season.is_active && !season.is_qualification_round && (
                      <Typography variant="caption" sx={{ bgcolor: 'grey.300', px: 1, borderRadius: 1 }}>
                        Inactive
                      </Typography>
                    )}
                  </Box>
                </TableCell>
                <TableCell>{season.question_count}</TableCell>
                <TableCell>{season.attempts_count}</TableCell>
                <TableCell>{season.qualified_users_count}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <IconButton 
                      size="small" 
                      color="primary" 
                      onClick={() => handleOpenDialog('edit', season)}
                      title="Edit Season"
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton 
                      size="small" 
                      color="error" 
                      onClick={() => handleDeleteSeason(season.id)}
                      title="Delete Season"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                    <IconButton 
                      size="small" 
                      color="primary" 
                      onClick={() => handleOpenQuestionsDialog(season.id)}
                      title="Manage Questions"
                    >
                      <CloudUploadIcon fontSize="small" />
                    </IconButton>
                    <IconButton 
                      size="small" 
                      color="primary" 
                      onClick={() => handleOpenQualifiedUsersDialog(season.id)}
                      title="View Qualified Users"
                    >
                      <PeopleIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      
      {/* Questions Dialog */}
      <Dialog 
        open={openQuestionsDialog} 
        onClose={handleCloseQuestionsDialog} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>Manage Questions</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              fullWidth
              label="Question Text"
              multiline
              rows={3}
              value={currentQuestion.question_text}
              onChange={(e) => handleQuestionChange('question_text', e.target.value)}
            />
            {currentQuestion.options.map((option, index) => (
              <TextField
                key={index}
                fullWidth
                label={`Option ${index + 1}`}
                value={option}
                onChange={(e) => handleOptionChange(index, e.target.value)}
              />
            ))}
            <TextField
              fullWidth
              label="Correct Answer"
              value={currentQuestion.correct_answer}
              onChange={(e) => handleQuestionChange('correct_answer', e.target.value)}
              helperText="Enter the exact text of the correct answer"
            />
            
            {questions.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="h6" gutterBottom>Existing Questions</Typography>
                {questions.map((q, index) => (
                  <Box key={index} sx={{ mb: 2, p: 2, border: '1px solid #ddd', borderRadius: 1 }}>
                    <Typography variant="body1" fontWeight="bold">{q.question_text}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Options: {q.options.join(', ')}
                    </Typography>
                    <Typography variant="body2" color="success.main">
                      Correct: {q.correct_answer}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseQuestionsDialog}>Cancel</Button>
          <Button onClick={handleSubmitQuestions} variant="contained" color="primary">
            Add Question
          </Button>
        </DialogActions>
      </Dialog>

      {/* Qualified Users Dialog */}
      <Dialog 
        open={openQualifiedUsersDialog} 
        onClose={handleCloseQualifiedUsersDialog} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>Qualified Users</DialogTitle>
        <DialogContent>
          {qualifiedUsers.length === 0 ? (
            <Typography sx={{ p: 2, textAlign: 'center' }}>
              No qualified users found for this season.
            </Typography>
          ) : (
            <TableContainer component={Paper} sx={{ mt: 1 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Username</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Score</TableCell>
                    <TableCell>Percentage</TableCell>
                    <TableCell>Completed At</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {qualifiedUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.username}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.score}</TableCell>
                      <TableCell>{user.percentage_score}%</TableCell>
                      <TableCell>{new Date(user.completed_at).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseQualifiedUsersDialog} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Main Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={handleCloseDialog} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>{dialogMode === 'create' ? 'Create New Season' : 'Edit Season'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              fullWidth
              label="Season Name"
              value={currentSeason.name || ''}
              onChange={(e) => handleSeasonChange('name', e.target.value)}
            />
            <TextField
              fullWidth
              type="date"
              label="Start Date"
              value={currentSeason.start_date || ''}
              onChange={(e) => handleSeasonChange('start_date', e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              fullWidth
              type="date"
              label="End Date"
              value={currentSeason.end_date || ''}
              onChange={(e) => handleSeasonChange('end_date', e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={currentSeason.is_active || false}
                  onChange={(e) => handleSeasonChange('is_active', e.target.checked)}
                />
              }
              label="Active"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={currentSeason.is_qualification_round || false}
                  onChange={(e) => handleSeasonChange('is_qualification_round', e.target.checked)}
                />
              }
              label="Qualification Round"
            />
            {currentSeason.is_qualification_round && (
              <TextField
                fullWidth
                type="number"
                label="Minimum Score Percentage"
                value={currentSeason.minimum_score_percentage || 50}
                onChange={(e) => handleSeasonChange('minimum_score_percentage', parseInt(e.target.value) || 50)}
                inputProps={{ min: 0, max: 100 }}
              />
            )}
            <TextField
              fullWidth
              label="Description (Optional)"
              multiline
              rows={3}
              value={currentSeason.description || ''}
              onChange={(e) => handleSeasonChange('description', e.target.value)}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmitSeason} variant="contained" color="primary">
            {dialogMode === 'create' ? 'Create' : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SeasonManager;