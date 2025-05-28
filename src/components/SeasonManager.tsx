import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Switch,
  IconButton,
  Chip,
  Tooltip,
  CircularProgress,
  Tabs,
  Tab,
  Divider
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PeopleIcon from '@mui/icons-material/People';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import api from '../utils/api';

interface Season {
  id?: string | number;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  is_active: boolean;
  is_qualification_round?: boolean;
  minimum_score_percentage?: number;
  created_at?: string;
  updated_at?: string;
  question_count?: number;
  attempts_count?: number;
  qualified_users_count?: number;
}

interface Question {
  id?: number;
  question_text: string;
  options: string[];
  correct_answer: string;
  category?: string;
  difficulty?: string;
}

interface QualifiedUser {
  id: number;
  username: string;
  email: string;
  score: number;
  percentage_score: number;
  completed_at: string;
}

interface ApiError {
  response?: {
    status: number;
    data: {
      message?: string;
      error?: string;
    };
  };
  message: string;
  config?: {
    url?: string;
    method?: string;
    data?: unknown;
  };
}

interface SeasonsResponse {
  data: Season[];
}

interface QuestionsResponse {
  data: Question[];
}

interface QualifiedUsersResponse {
  data: QualifiedUser[];
}

interface SeasonManagerProps {}

const SeasonManager: React.FC<SeasonManagerProps> = () => {
  // Consolidated state management
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [currentSeason, setCurrentSeason] = useState<Partial<Season>>({
    name: '',
    description: '',
    start_date: new Date().toISOString(),
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    is_active: false,
    is_qualification_round: false,
    minimum_score_percentage: 50
  });
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [openDialog, setOpenDialog] = useState(false);
  const [openQuestionsDialog, setOpenQuestionsDialog] = useState(false);
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | string | null>(null);
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
  const fetchSeasons = async () => {
    try {
      setLoading(true);
      const response = await api.get<SeasonsResponse>('/api/admin/seasons');
      setSeasons(response.data.data);
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
  };
  
  useEffect(() => {
    fetchSeasons().catch(console.error);
  }, [fetchSeasons]);
  
  // Handle tab change
  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  // Handle dialog open/close
  const handleOpenDialog = (mode: 'create' | 'edit', season?: Season) => {
    setDialogMode(mode);
    if (mode === 'edit' && season) {
      setCurrentSeason({
        ...season,
        start_date: season.start_date,
        end_date: season.end_date
      });
    } else {
      setCurrentSeason({
        name: '',
        description: '',
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        is_active: false,
        is_qualification_round: false,
        minimum_score_percentage: 50
      });
    }
    setOpenDialog(true);
  };
  
  const handleCloseDialog = () => {
    setOpenDialog(false);
  };
  
  // Handle season form changes
  const handleSeasonChange = (field: keyof Season, value: any) => {
    setCurrentSeason(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Handle season form submission
  const handleSubmitSeason = async () => {
    if (!currentSeason) return;
    
    try {
      // Log the raw currentSeason for debugging
      console.log('Raw currentSeason:', JSON.parse(JSON.stringify(currentSeason)));
      
      // Ensure required fields are present
      if (!currentSeason.name) throw new Error('Season name is required');
      if (!currentSeason.start_date) throw new Error('Start date is required');
      if (!currentSeason.end_date) throw new Error('End date is required');

      // Format dates to ISO string without milliseconds
      const formatDate = (date: Date | string): string => {
        try {
          const d = new Date(date);
          if (isNaN(d.getTime())) throw new Error('Invalid date');
          return d.toISOString().split('.')[0] + 'Z';
        } catch (e) {
          console.error('Error formatting date:', { date, error: e });
          throw new Error(`Invalid date format: ${date}`);
        }
      };

      const seasonData = {
        name: currentSeason.name,
        startDate: formatDate(currentSeason.start_date),
        endDate: formatDate(currentSeason.end_date)
      };

      console.log('Submitting season data:', JSON.stringify(seasonData, null, 2));
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
      
      let response;
      try {
        if (dialogMode === 'create') {
          response = await api.post('/api/admin/seasons', seasonData, { 
            headers,
            validateStatus: (status) => status < 500 // Don't throw on 4xx errors
          });
          console.log('Create season response:', response);
        } else if (currentSeason.id) {
          response = await api.put(`/api/admin/seasons/${currentSeason.id}`, seasonData, { 
            headers,
            validateStatus: (status) => status < 500
          });
          console.log('Update season response:', response);
        } else {
          throw new Error('Cannot update season: No season ID provided');
        }
        
        if (response.status >= 400) {
          throw new Error(response.data?.message || `Request failed with status ${response.status}`);
        }
        
        // Refresh seasons
        await fetchSeasons();
        setOpenDialog(false);
        setError(null);
        
      } catch (requestError: unknown) {
        console.error('API Request Error:', {
          message: (requestError as ApiError).message,
          response: (requestError as ApiError).response?.data,
          status: (requestError as ApiError).response?.status,
          config: {
            url: (requestError as ApiError).config?.url,
            method: (requestError as ApiError).config?.method,
            data: (requestError as ApiError).config?.data
          }
        });
        
        const apiError = requestError as ApiError;
        const errorMessage = apiError.response?.data?.message || 
                           apiError.response?.data?.error || 
                           apiError.message || 
                           'Failed to submit season';
        
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    } catch (err: any) {
      console.error('Error in handleSubmitSeason:', {
        name: err.name,
        message: err.message,
        stack: err.stack,
        ...(err.response && {
          response: {
            status: err.response.status,
            statusText: err.response.statusText,
            data: err.response.data
          }
        })
      });
      
      // If we haven't set an error message yet, set a generic one
      if (!error) {
        setError(err.message || 'An unexpected error occurred');
      }
    }
  };

  // Handle season deletion
  const handleDeleteSeason = async (id: number | string) => {
    if (!window.confirm('Are you sure you want to delete this season? This action cannot be undone.')) {
      return;
    }
    
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      const numId = Number(id);
      await api.delete(`/api/admin/seasons/${numId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      // Refresh seasons
      await fetchSeasons();
      setError(null);
    } catch (err: unknown) {
      console.error('Error deleting season:', {
        message: (err as ApiError).message,
        response: (err as ApiError).response?.data,
        status: (err as ApiError).response?.status,
        config: {
          url: (err as ApiError).config?.url,
          method: (err as ApiError).config?.method
        }
      });
      
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
      const response = await api.get<QuestionsResponse>(`/api/admin/seasons/${numSeasonId}/questions`);
      setQuestions(response.data.data);
      setOpenQuestionsDialog(true);
    } catch (err: any) {
      console.error('Error fetching season questions:', err);
      setError(err.message || 'Failed to load questions');
    }
  };

  // Handle questions dialog
  const handleCloseQuestionsDialog = () => {
    setOpenQuestionsDialog(false);
  };

  // Handle question form changes
  const handleQuestionChange = (field: string, value: any) => {
    setCurrentQuestion(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleOptionChange = (index: number, value: string) => {
    setCurrentQuestion(prev => {
      const newOptions = [...prev.options];
      newOptions[index] = value;
      return {
        ...prev,
        options: newOptions
      };
    });
  };

  // Add question to list
  const handleAddQuestion = () => {
    if (!currentQuestion.question_text || !currentQuestion.correct_answer) {
      return;
    }
    
    const tempQuestion: Question = {
      ...currentQuestion,
      id: questions.length + 1  // Temporary id generation
    };
    
    setQuestions(prev => [...prev, tempQuestion]);
    setCurrentQuestion({
      question_text: '',
      options: ['', '', '', ''],
      correct_answer: '',
      category: undefined,
      difficulty: undefined
    });
  };

  // Remove question from list
  const handleRemoveQuestion = (index: number) => {
    setQuestions(prev => prev.filter((_, i) => i !== index));
  };

  // Submit questions
  const handleSubmitQuestions = async () => {
    if (!selectedSeasonId) return;
    
    try {
      await api.post(`/api/admin/seasons/${selectedSeasonId}/questions`, {
        questions: questions.map(q => q.id)
      });
      
      handleCloseQuestionsDialog();
      fetchSeasons(); // Refresh seasons list to update question count
    } catch (err: any) {
      console.error('Error adding questions to season:', err);
      setError(err.message || 'Failed to add questions');
    }
  };

  // Handle qualified users dialog
  const handleOpenQualifiedUsersDialog = async (seasonId: number | string) => {
    const numSeasonId = Number(seasonId);
    setSelectedSeasonId(numSeasonId);
    try {
      const response = await api.get<QualifiedUsersResponse>(`/api/admin/seasons/${numSeasonId}/qualified-users`);
      setQualifiedUsers(response.data.data);
      setOpenQualifiedUsersDialog(true);
    } catch (err: any) {
      console.error('Error fetching qualified users:', err);
      setError(err.message || 'Failed to load qualified users');
    }
  };

  const handleCloseQualifiedUsersDialog = () => {
    setOpenQualifiedUsersDialog(false);
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
        <Box sx={{ mb: 2 }}>
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
            {(Array.isArray(seasons) ? seasons : [])
              .filter(season => {
                if (tabValue === 1) return season.is_active;
                if (tabValue === 2) return season.is_qualification_round;
                return true;
              })
              .map(season => (
                <TableRow key={season.id}>
                  <TableCell>
                    <Typography variant="subtitle1">
                      {season.name}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {season.description}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {new Date(season.start_date).toLocaleDateString()} - {new Date(season.end_date).toLocaleDateString()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {season.is_active && (
                        <Chip 
                          label="Active" 
                          color="success" 
                          size="small" 
                          icon={<CheckIcon />} 
                        />
                      )}
                      {season.is_qualification_round && (
                        <Chip 
                          label="Qualification" 
                          color="primary" 
                          size="small" 
                        />
                      )}
                      <Tooltip title={`Minimum Score: ${season.minimum_score_percentage}%`}>
                        <Chip 
                          label={`${season.minimum_score_percentage}%`} 
                          color="secondary" 
                          size="small" 
                        />
                      </Tooltip>
                    </Box>
                  </TableCell>
                  <TableCell>{season.question_count}</TableCell>
                  <TableCell>{season.attempts_count}</TableCell>
                  <TableCell>{season.qualified_users_count}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title="Edit Season">
                        <IconButton 
                          size="small" 
                          color="primary" 
                          onClick={() => handleOpenDialog('edit', season)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Season">
                        <IconButton 
                          size="small" 
                          color="error" 
                          onClick={() => {
                            if (typeof season.id === 'number') {
                              handleDeleteSeason(season.id);
                            }
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Upload Questions">
                        <IconButton 
                          size="small" 
                          color="primary" 
                          onClick={() => handleOpenQuestionsDialog(season.id)}
                        >
                          <CloudUploadIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="View Qualified Users">
                        <IconButton 
                          size="small" 
                          color="primary" 
                          onClick={() => handleOpenQualifiedUsersDialog(season.id)}
                        >
                          <PeopleIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </TableContainer>
      
      {/* Season Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {dialogMode === 'create' ? 'Create New Season' : 'Edit Season'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField 
              label="Season Name"
              value={currentSeason.name || ''}
              onChange={(e) => handleSeasonChange('name', e.target.value)}
              fullWidth
              required
            />
            
            <TextField 
              label="Description"
              value={currentSeason.description || ''}
              onChange={(e) => handleSeasonChange('description', e.target.value)}
              fullWidth
              multiline
              rows={3}
            />
            
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Start Date"
                type="datetime-local"
                value={new Date(currentSeason.start_date || new Date()).toISOString().slice(0, 16)}
                onChange={(e) => handleSeasonChange('start_date', new Date(e.target.value).toISOString())}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
              
              <TextField
                label="End Date"
                type="datetime-local"
                value={new Date(currentSeason.end_date || new Date()).toISOString().slice(0, 16)}
                onChange={(e) => handleSeasonChange('end_date', new Date(e.target.value).toISOString())}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Box>
            
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControlLabel 
                control={
                  <Switch 
                    checked={currentSeason.is_active || false}
                    onChange={(e) => handleSeasonChange('is_active', e.target.checked)}
                  />
                } 
                label="Active Season"
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
            </Box>
            
            <TextField 
              label="Minimum Score Percentage"
              type="number"
              value={currentSeason.minimum_score_percentage || 50}
              onChange={(e) => handleSeasonChange('minimum_score_percentage', parseInt(e.target.value))}
              fullWidth
              InputProps={{
                inputProps: { min: 0, max: 100 }
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleSubmitSeason}
            disabled={!currentSeason.name}
          >
            {dialogMode === 'create' ? 'Create' : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Questions Dialog */}
      <Dialog open={openQuestionsDialog} onClose={handleCloseQuestionsDialog} maxWidth="md" fullWidth>
        <DialogTitle>Upload Questions</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Add a new question
            </Typography>
            
            <TextField 
              label="Question Text"
              value={currentQuestion.question_text || ''}
              onChange={(e) => handleQuestionChange('question_text', e.target.value)}
              fullWidth
              required
            />
            
            <Typography variant="subtitle2" gutterBottom>
              Options
            </Typography>
            
            {currentQuestion.options.map((option, index) => (
              <TextField 
                key={index}
                label={`Option ${index + 1}`}
                value={option}
                onChange={(e) => handleOptionChange(index, e.target.value)}
                fullWidth
                required
              />
            ))}
            
            <TextField 
              label="Correct Answer"
              value={currentQuestion.correct_answer || ''}
              onChange={(e) => handleQuestionChange('correct_answer', e.target.value)}
              fullWidth
              required
              helperText="Enter the exact text of the correct option"
            />
            
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField 
                label="Category"
                value={currentQuestion.category || ''}
                onChange={(e) => handleQuestionChange('category', e.target.value)}
                fullWidth
              />
              
              <TextField 
                label="Difficulty"
                value={currentQuestion.difficulty || ''}
                onChange={(e) => handleQuestionChange('difficulty', e.target.value)}
                fullWidth
              />
            </Box>
            
            <Button 
              variant="contained" 
              onClick={handleAddQuestion}
              disabled={!currentQuestion.question_text || !currentQuestion.correct_answer}
              sx={{ mt: 2 }}
            >
              Add Question
            </Button>
          </Box>
          
          {questions.length > 0 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Questions to Add ({questions.length})
              </Typography>
              
              <TableContainer component={Paper} sx={{ maxHeight: 300 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Question</TableCell>
                      <TableCell>Correct Answer</TableCell>
                      <TableCell>Category</TableCell>
                      <TableCell>Difficulty</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {questions.map((q, index) => (
                      <TableRow key={index}>
                        <TableCell>{q.question_text}</TableCell>
                        <TableCell>{q.correct_answer}</TableCell>
                        <TableCell>{q.category || 'General'}</TableCell>
                        <TableCell>{q.difficulty || 'Medium'}</TableCell>
                        <TableCell>
                          <IconButton 
                            size="small" 
                            color="error" 
                            onClick={() => handleRemoveQuestion(index)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseQuestionsDialog}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleSubmitQuestions}
            disabled={questions.length === 0}
          >
            Upload Questions
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Qualified Users Dialog */}
      <Dialog open={openQualifiedUsersDialog} onClose={handleCloseQualifiedUsersDialog} maxWidth="md" fullWidth>
        <DialogTitle>Qualified Users</DialogTitle>
        <DialogContent>
          {qualifiedUsers.length === 0 ? (
            <Typography sx={{ p: 2 }}>
              No qualified users found for this season.
            </Typography>
          ) : (
            <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Rank</TableCell>
                    <TableCell>Username</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Score</TableCell>
                    <TableCell>Percentage</TableCell>
                    <TableCell>Completed</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {qualifiedUsers.map((user, index) => (
                    <TableRow key={user.id}>
                      <TableCell>{index + 1}</TableCell>
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
          <Button onClick={handleCloseQualifiedUsersDialog}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SeasonManager;
