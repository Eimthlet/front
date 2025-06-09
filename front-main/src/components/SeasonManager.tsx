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
  Alert
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
  question?: string; // For backward compatibility
  options: string[];
  correct_answer: string;
  correctAnswer?: string; // For backward compatibility
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

const SeasonManager: React.FC = () => {
  // State management
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [currentSeason, setCurrentSeason] = useState<Partial<Season>>({
    name: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    is_active: false,
  });
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [openDialog, setOpenDialog] = useState(false);
  const [openQuestionsDialog, setOpenQuestionsDialog] = useState(false);
  const [openQualifiedUsersDialog, setOpenQualifiedUsersDialog] = useState(false);
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [qualifiedUsers, setQualifiedUsers] = useState<QualifiedUser[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question>({
    question_text: '',
    question: '', // For backward compatibility
    options: ['', '', '', ''],
    correct_answer: '',
    correctAnswer: '', // For backward compatibility
    season_id: undefined
  } as Question); // Type assertion to handle the expanded interface
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch seasons on component mount
  useEffect(() => {
    const fetchSeasons = async () => {
      try {
        setLoading(true);
        setError('');
        const data = await api.get<Season[]>('/admin/seasons');
        setSeasons(Array.isArray(data) ? data : []);
      } catch (err: any) {
        console.error('Error fetching seasons:', err);
        setError(err.message || 'Failed to fetch seasons');
        setSeasons([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSeasons();
  }, []);

  // Handle tab change
  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Dialog handlers
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setCurrentSeason({});
  };

  const handleCloseQuestionsDialog = () => {
    setOpenQuestionsDialog(false);
    setCurrentQuestion({
      question_text: '',
      question: '', // For backward compatibility
      options: ['', '', '', ''],
      correct_answer: '',
      correctAnswer: '', // For backward compatibility
      season_id: undefined
    } as Question); // Type assertion to handle the expanded interface
  };

  const handleCloseQualifiedUsersDialog = () => {
    setOpenQualifiedUsersDialog(false);
    setQualifiedUsers([]);
  };

  // Handle opening the dialog
  const handleOpenDialog = useCallback((mode: 'create' | 'edit', season?: Season) => {
    setDialogMode(mode);
    if (mode === 'edit' && season) {
      setCurrentSeason(season);
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
  }, []);

  // Fetch questions for a season
  const fetchQuestions = useCallback(async (seasonId: number | string) => {
    try {
      setLoading(true);
      const questionsData = await api.get<Question[]>(`/admin/seasons/${seasonId}/questions`);
      
      // Map the response to ensure consistent field names
      const normalizedQuestions = (Array.isArray(questionsData) ? questionsData : []).map(q => ({
        ...q,
        question: q.question || q.question_text,
        question_text: q.question_text || q.question || '',
        correctAnswer: q.correctAnswer || q.correct_answer,
        correct_answer: q.correct_answer || q.correctAnswer || ''
      }));
      
      setQuestions(normalizedQuestions);
      return normalizedQuestions;
    } catch (err: any) {
      const error = err as ApiError;
      console.error('Error fetching questions:', error);
      setError(error.response?.data?.message || 'Failed to fetch questions');
      setQuestions([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError, setQuestions]);

  // Handle view questions
  const handleViewQuestions = useCallback(async (seasonId: number | string) => {
    setSelectedSeasonId(Number(seasonId));
    
    try {
      setLoading(true);
      // Fetch questions for the season
      const questionsData = await fetchQuestions(seasonId);
      setQuestions(questionsData);
      setOpenQuestionsDialog(true);
    } catch (err) {
      console.error('Error in handleViewQuestions:', err);
      setError('Failed to load questions');
    } finally {
      setLoading(false);
    }
  }, [fetchQuestions, setLoading, setError, setQuestions, setOpenQuestionsDialog]);

  // Handle view qualified users
  const handleViewQualifiedUsers = useCallback(async (seasonId: number | string) => {
    try {
      setLoading(true);
      setSelectedSeasonId(Number(seasonId));
      
      // Fetch qualified users for the season
      const usersData = await api.get<QualifiedUser[]>(`/admin/seasons/${seasonId}/qualified-users`);
      setQualifiedUsers(Array.isArray(usersData) ? usersData : []);
      
      setOpenQualifiedUsersDialog(true);
    } catch (err: any) {
      const error = err as ApiError;
      setError(error.response?.data?.message || 'Failed to fetch qualified users');
      setQualifiedUsers([]);
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError, setSelectedSeasonId, setQualifiedUsers, setOpenQualifiedUsersDialog]);

  // Alias for backward compatibility
  const handleOpenQuestionsDialog = handleViewQuestions;
  const handleOpenQualifiedUsersDialog = handleViewQualifiedUsers;

  // Handle form changes
  const handleSeasonChange = useCallback((field: keyof Season, value: any) => {
    setCurrentSeason(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const handleQuestionChange = useCallback((field: keyof Question, value: string) => {
    setCurrentQuestion(prev => {
      // Map frontend field names to backend field names
      const fieldMap: Record<string, string> = {
        'question': 'question_text',
        'correctAnswer': 'correct_answer',
        'question_text': 'question_text',
        'correct_answer': 'correct_answer'
      };
      
      const backendField = fieldMap[field] || field;
      
      return {
        ...prev,
        [field]: value, // Keep original for form binding
        [backendField]: value // Set backend field
      };
    });
  }, []);

  const handleOptionChange = useCallback((index: number, value: string) => {
    const newOptions = [...currentQuestion.options];
    newOptions[index] = value;
    setCurrentQuestion(prev => ({
      ...prev,
      options: newOptions
    }));
  }, [currentQuestion.options]);

  // Form submissions
  const handleSubmitSeason = useCallback(async () => {
    try {
      setError('');
      setLoading(true);
      
      // Validate required fields
      if (!currentSeason.name?.trim()) {
        throw new Error('Season name is required');
      }
      
      if (!currentSeason.start_date) {
        throw new Error('Start date is required');
      }
      
      if (!currentSeason.end_date) {
        throw new Error('End date is required');
      }

      // Ensure dates are valid
      const startDate = new Date(currentSeason.start_date);
      const endDate = new Date(currentSeason.end_date);
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new Error('Invalid date format');
      }
      
      if (startDate >= endDate) {
        throw new Error('End date must be after start date');
      }
      
      // Format dates to YYYY-MM-DD
      const formatDate = (date: Date) => date.toISOString().split('T')[0];
      
      // Prepare the season data with all required fields
      const seasonData = {
        name: currentSeason.name.trim(),
        start_date: formatDate(startDate),
        end_date: formatDate(endDate),
        is_active: Boolean(currentSeason.is_active),
        is_qualification_round: Boolean(currentSeason.is_qualification_round),
        minimum_score_percentage: currentSeason.is_qualification_round 
          ? Math.min(100, Math.max(0, Number(currentSeason.minimum_score_percentage) || 50))
          : 0,
        description: currentSeason.description?.trim() || ''
      };
      
      if (dialogMode === 'create') {
        await api.post<Season>('/admin/seasons', seasonData);
        setSuccess('Season created successfully');
      } else if (currentSeason.id) {
        await api.put<Season>(`/admin/seasons/${currentSeason.id}`, seasonData);
        setSuccess('Season updated successfully');
      }
      
      // Refresh seasons
      const seasonsData = await api.get<Season[]>('/admin/seasons');
      setSeasons(Array.isArray(seasonsData) ? seasonsData : []);
      
      handleCloseDialog();
    } catch (err: any) {
      const error = err as ApiError;
      console.error('Error saving season:', error);
      const errorMessage = error.response?.data?.message || 
                         error.response?.data?.error || 
                         error.message || 
                         'Failed to save season. Please check all required fields.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [currentSeason, dialogMode]);

  const handleSubmitQuestions = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      // Use question_text or fall back to question for backward compatibility
      const questionText = currentQuestion.question_text || currentQuestion.question || '';
      
      // Validate question data
      if (!questionText.trim()) {
        throw new Error('Question text is required');
      }
      
      if (currentQuestion.options.some(opt => !opt.trim())) {
        throw new Error('All options must be filled');
      }
      
      // Use correct_answer or fall back to correctAnswer for backward compatibility
      const correctAnswer = currentQuestion.correct_answer || currentQuestion.correctAnswer || '';
      
      if (!correctAnswer.trim()) {
        throw new Error('Please select a correct answer');
      }
      
      if (!selectedSeasonId) {
        throw new Error('No season selected');
      }
      
      // Prepare question data for the backend
      const questionData = {
        question_text: questionText,
        question: questionText, // For backward compatibility
        options: currentQuestion.options,
        correct_answer: correctAnswer,
        correctAnswer: correctAnswer, // For backward compatibility
        season_id: selectedSeasonId
      };
      
      // Send to the backend
      if (currentQuestion.id) {
        await api.put(`/admin/questions/${currentQuestion.id}`, questionData);
      } else {
        // Wrap in a questions array as expected by the server
        await api.post(`/admin/seasons/${selectedSeasonId}/questions`, {
          questions: [questionData]
        });
      }
      
      // Refresh questions
      await fetchQuestions(selectedSeasonId);
      
      // Reset form
      setCurrentQuestion({
        question_text: '',
        question: '', // For backward compatibility
        options: ['', '', '', ''],
        correct_answer: '',
        correctAnswer: '', // For backward compatibility
        season_id: undefined
      } as Question); // Type assertion to handle the expanded interface
      
      // Refresh questions if we have a selected season
      if (selectedSeasonId) {
        await fetchQuestions(selectedSeasonId);
      }
      
      setSuccess('Question saved successfully');
    } catch (err) {
      console.error('Error in handleSubmitQuestions:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to save question';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [currentQuestion, selectedSeasonId]);

  // Delete handlers
  const handleDeleteSeason = useCallback(async (id: number | string) => {
    if (!window.confirm('Are you sure you want to delete this season?')) return;
    
    try {
      setLoading(true);
      await api.delete(`/admin/seasons/${id}`);
      
      // Refresh seasons
      const seasonsData = await api.get<Season[]>('/admin/seasons');
      setSeasons(Array.isArray(seasonsData) ? seasonsData : []);
      
      setSuccess('Season deleted successfully');
    } catch (err: any) {
      const error = err as ApiError;
      setError(error.response?.data?.message || 'Failed to delete season');
    } finally {
      setLoading(false);
    }
  }, []);

  // Filter seasons based on tab selection
  const getFilteredSeasons = useCallback(() => {
    if (!Array.isArray(seasons)) return [];
    
    switch (tabValue) {
      case 1: // Active Seasons
        return seasons.filter(season => season.is_active);
      case 2: // Qualification Rounds
        return seasons.filter(season => season.is_qualification_round);
      default: // All Seasons
        return seasons;
    }
  }, [seasons, tabValue]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
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
      
      {/* Error/Success Messages */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}
      
      {/* Tabs */}
      <Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: 2 }}>
        <Tab label="All Seasons" />
        <Tab label="Active Seasons" />
        <Tab label="Qualification Rounds" />
      </Tabs>
      
      {/* Seasons Table */}
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
                <TableCell>
                  {new Date(season.start_date).toLocaleDateString()} - {new Date(season.end_date).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {season.is_active && (
                      <Typography variant="caption" sx={{ 
                        bgcolor: 'success.light', 
                        color: 'white',
                        px: 1, 
                        borderRadius: 1 
                      }}>
                        Active
                      </Typography>
                    )}
                    {season.is_qualification_round && (
                      <Typography variant="caption" sx={{ 
                        bgcolor: 'info.light', 
                        color: 'white',
                        px: 1, 
                        borderRadius: 1 
                      }}>
                        Qualification
                      </Typography>
                    )}
                    {!season.is_active && !season.is_qualification_round && (
                      <Typography variant="caption" sx={{ 
                        bgcolor: 'grey.400', 
                        color: 'white',
                        px: 1, 
                        borderRadius: 1 
                      }}>
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
          <Button 
            onClick={handleSubmitQuestions} 
            variant="contained" 
            color="primary"
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Question'}
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

      {/* Season Form Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={handleCloseDialog} 
        maxWidth="sm" 
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
          <Button 
            onClick={handleSubmitSeason} 
            variant="contained" 
            color="primary"
            disabled={loading}
          >
            {loading ? 'Saving...' : (dialogMode === 'create' ? 'Create' : 'Update')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SeasonManager;