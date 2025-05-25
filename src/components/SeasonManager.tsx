import React, { useState, useEffect } from 'react';
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
// @ts-ignore
import { 
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  People as PeopleIcon,
  CloudUpload as CloudUploadIcon,
  Check as CheckIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import api from '../utils/api';

interface Season {
  id: number;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  is_active: boolean;
  is_qualification_round: boolean;
  minimum_score_percentage: number;
  created_at: string;
  updated_at: string;
  question_count: number;
  attempts_count: number;
  qualified_users_count: number;
}

interface Question {
  id: number;
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

const SeasonManager: React.FC = () => {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [currentSeason, setCurrentSeason] = useState<Partial<Season>>({
    name: '',
    description: '',
    start_date: new Date().toISOString(),
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    is_active: false,
    is_qualification_round: false,
    minimum_score_percentage: 50
  });
  
  const [openQuestionsDialog, setOpenQuestionsDialog] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Omit<Question, 'id'>>({
    question_text: '',
    options: ['', '', '', ''],
    correct_answer: ''
  });
  
  const [openQualifiedUsersDialog, setOpenQualifiedUsersDialog] = useState(false);
  const [qualifiedUsers, setQualifiedUsers] = useState<QualifiedUser[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | null>(null);
  
  const [tabValue, setTabValue] = useState(0);
  
  // Fetch seasons
  const fetchSeasons = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/seasons');
      setSeasons(response.data as Season[]);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching seasons:', err);
      setError(err.message || 'Failed to load seasons');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSeasons();
  }, []);
  
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
  const handleSeasonChange = (field: string, value: any) => {
    setCurrentSeason(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
// Handle season form submission
const handleSubmitSeason = async () => {
  try {
    // Ensure dates are properly formatted as ISO strings
    const seasonData = {
      ...currentSeason,
      start_date: typeof currentSeason.start_date === 'string' ? currentSeason.start_date : new Date(currentSeason.start_date!).toISOString(),
      end_date: typeof currentSeason.end_date === 'string' ? currentSeason.end_date : new Date(currentSeason.end_date!).toISOString(),
      minimum_score_percentage: Number(currentSeason.minimum_score_percentage) || 50,
      is_active: Boolean(currentSeason.is_active),
      is_qualification_round: Boolean(currentSeason.is_qualification_round)
    };

    console.log('Submitting season data:', seasonData);
    
    if (dialogMode === 'create') {
      await api.post('/api/admin/seasons', seasonData);
    } else {
      await api.put(`/api/admin/seasons/${currentSeason.id}`, seasonData);
    }
    
    // Refresh seasons
    const response = await api.get('/api/admin/seasons');
    setSeasons(response.data as Season[]);
    
    handleCloseDialog();
  } catch (err: any) {
    console.error('Error submitting season:', err);
    setError(err.response?.data?.error || err.message || 'Failed to submit season');
  }
};

  //Handle season deletion
const handleDeleteSeason = async (id: number) => {
  if (window.confirm('Are you sure you want to delete this season? This action cannot be undone.')) {
    try {
      await api.delete(`/api/admin/seasons/${id}`);
      
      // Refresh seasons
      const response = await api.get('/api/admin/seasons');
      setSeasons(response.data as Season[]);
    } catch (err: any) {
      console.error('Error deleting season:', err);
      setError(err.response?.data?.error || err.message || 'Failed to delete season');
    }
  }
};
  
  // Handle questions dialog
  const handleOpenQuestionsDialog = async (seasonId: number) => {
    setSelectedSeasonId(seasonId);
    setQuestions([]);
    setCurrentQuestion({
      question_text: '',
      options: ['', '', '', ''],
      correct_answer: ''
    });
    try {
      const response = await api.get<Question[]>(`/api/seasons/${seasonId}/questions`);
      setQuestions(response.data);
      setOpenQuestionsDialog(true);
    } catch (err: any) {
      console.error('Error fetching season questions:', err);
      setError(err.message || 'Failed to load questions');
    }
  };
  
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
      id: Math.floor(Math.random() * -1000000) // Use negative IDs for temporary questions
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
      await api.post(`/api/seasons/${selectedSeasonId}/questions`, {
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
  const handleOpenQualifiedUsersDialog = async (seasonId: number) => {
    setSelectedSeasonId(seasonId);
    try {
      const response = await api.get<QualifiedUser[]>(`/api/seasons/${seasonId}/qualified-users`);
      setQualifiedUsers(response.data);
      setOpenQualifiedUsersDialog(true);
    } catch (err: any) {
      console.error('Error fetching qualified users:', err);
      setError(err.message || 'Failed to load qualified users');
    }
  };
  
  const handleCloseQualifiedUsersDialog = () => {
    setOpenQualifiedUsersDialog(false);
  };
  
  // Handle tab change
  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
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
              value={currentQuestion.question_text}
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
              value={currentQuestion.correct_answer}
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
