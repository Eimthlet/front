import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/apiClient';
import SeasonManager from './SeasonManager';
import { 
  Box, 
  Button, 
  TextField, 
  Typography, 
  CircularProgress, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Tabs, 
  Tab,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Alert
} from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import DeleteIcon from '@mui/icons-material/Delete';

// API Response Interfaces
interface ApiResponse<T> {
  data: T;
  message?: string;
}

// Define interfaces
interface Question {
  id?: number;
  question: string;
  options: string[];
  correctAnswer: string;
  timeLimit: number;
  category: string;
  difficulty: string;
}

interface ErrorState {
  message: string;
  details?: string;
}

interface Season {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

interface AdminPanelProps {}

// Tab panel component
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
};

function a11yProps(index: number) {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
  };
}

const AdminPanel: React.FC<AdminPanelProps> = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  // State variables
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | null>(null);
  const [error, setError] = useState<ErrorState | null>(null);
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [adminCheckFailed, setAdminCheckFailed] = useState(false);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [newQuestion, setNewQuestion] = useState<Omit<Question, 'id'>>({
    question: '',
    options: ['', '', '', ''],
    correctAnswer: '',
    timeLimit: 30,
    category: 'General Knowledge',
    difficulty: 'Medium'
  });

  // Helper functions - moved before usage
  const updateError = useCallback((message: string, details?: string) => {
    setError({ message, details });
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const updateSuccess = useCallback((message: string) => {
    setSuccess(message);
    setTimeout(() => setSuccess(''), 5000);
  }, []);

  // Fetch questions for the selected season
  const fetchQuestions = useCallback(async () => {
    if (!selectedSeasonId) return;
    
    try {
      setIsLoading(true);
      const response = await api.get<Question[]>(`/admin/seasons/${selectedSeasonId}/questions`);
      setQuestions(response.data);
    } catch (error) {
      console.error('Error fetching questions:', error);
      updateError('Error', 'Failed to load questions');
    } finally {
      setIsLoading(false);
    }
  }, [selectedSeasonId, updateError]);

  // Fetch seasons
  const fetchSeasons = useCallback(async () => {
    try {
      const response = await api.get<Season[]>('/admin/seasons');
      const seasonsData = response.data;
      setSeasons(seasonsData);
      if (seasonsData.length > 0 && !selectedSeasonId) {
        setSelectedSeasonId(seasonsData[0].id);
      }
    } catch (error) {
      console.error('Error fetching seasons:', error);
      updateError('Error', 'Failed to load seasons');
    }
  }, [selectedSeasonId, updateError]);

  // Check admin status on component mount
  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        setIsVerifying(true);
        if (!isAdmin) {
          setAdminCheckFailed(true);
          navigate('/');
        }
      } catch (error) {
        console.error('Error verifying admin status:', error);
        setAdminCheckFailed(true);
      } finally {
        setIsVerifying(false);
      }
    };

    checkAdminStatus();
  }, [isAdmin, navigate]);

  // Fetch initial data
  useEffect(() => {
    const fetchInitialData = async () => {
      await fetchSeasons();
    };
    if (!isVerifying && isAdmin && !adminCheckFailed) {
      fetchInitialData();
    }
  }, [fetchSeasons, isVerifying, isAdmin, adminCheckFailed]);

  // Fetch questions when selectedSeasonId changes
  useEffect(() => {
    if (selectedSeasonId && !isVerifying && isAdmin && !adminCheckFailed) {
      fetchQuestions();
    }
  }, [selectedSeasonId, fetchQuestions, isVerifying, isAdmin, adminCheckFailed]);

  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewQuestion(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle option change
  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...newQuestion.options];
    newOptions[index] = value;
    setNewQuestion(prev => ({
      ...prev,
      options: newOptions
    }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedSeasonId) {
      updateError('No Season Selected', 'Please select a season before adding a question.');
      return;
    }

    try {
      setIsLoading(true);
      clearError();

      // Validate question data
      if (!newQuestion.question.trim()) {
        throw new Error('Question text is required');
      }

      if (newQuestion.options.some(opt => !opt.trim())) {
        throw new Error('All options must be filled');
      }

      if (!newQuestion.correctAnswer) {
        throw new Error('Please select the correct answer');
      }

      // Submit the question
      await api.post<ApiResponse<Question>>(`/admin/seasons/${selectedSeasonId}/questions`, newQuestion);
      await fetchQuestions();
      updateSuccess('Question added successfully!');
      
      // Reset form
      setNewQuestion({
        question: '',
        options: ['', '', '', ''],
        correctAnswer: '',
        timeLimit: 30,
        category: 'General Knowledge',
        difficulty: 'Medium'
      });
    } catch (error) {
      console.error('Error adding question:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to add question';
      updateError('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle question deletion
  const handleDeleteQuestion = async (questionId: number) => {
    if (!window.confirm('Are you sure you want to delete this question?')) {
      return;
    }

    try {
      setIsLoading(true);
      await api.delete<ApiResponse<{ message: string }>>(`/admin/questions/${questionId}`);
      await fetchQuestions();
      updateSuccess('Question deleted successfully!');
    } catch (error) {
      console.error('Error deleting question:', error);
      updateError('Error', 'Failed to delete question');
    } finally {
      setIsLoading(false);
    }
  };

  // Render loading state
  if (isVerifying || !isAdmin) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // Render admin check failed
  if (adminCheckFailed) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <ErrorOutlineIcon color="error" sx={{ fontSize: 60, mb: 2 }} />
        <Typography variant="h5" gutterBottom>
          Access Denied
        </Typography>
        <Typography variant="body1" paragraph>
          You don't have permission to access the admin panel.
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={() => navigate('/')}
        >
          Return to Home
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Admin Panel
      </Typography>

      {/* Error Alert */}
      {error && (
        <Alert 
          severity="error" 
          onClose={clearError}
          sx={{ mb: 2 }}
        >
          <Typography variant="subtitle1">{error.message}</Typography>
          {error.details && (
            <Typography variant="body2">{error.details}</Typography>
          )}
        </Alert>
      )}

      {/* Success Alert */}
      {success && (
        <Alert 
          severity="success" 
          onClose={() => setSuccess('')}
          sx={{ mb: 2 }}
        >
          {success}
        </Alert>
      )}

      <Tabs 
        value={tabValue} 
        onChange={handleTabChange} 
        aria-label="admin panel tabs"
        sx={{ mb: 3 }}
      >
        <Tab label="Questions" {...a11yProps(0)} />
        <Tab label="Seasons" {...a11yProps(1)} />
      </Tabs>

      <TabPanel value={tabValue} index={0}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Add New Question
          </Typography>
          <Paper sx={{ p: 3, mb: 3 }}>
            <form onSubmit={handleSubmit}>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel id="season-select-label">Season</InputLabel>
                <Select
                  labelId="season-select-label"
                  id="season-select"
                  value={selectedSeasonId || ''}
                  onChange={(e) => setSelectedSeasonId(Number(e.target.value))}
                  label="Season"
                  required
                >
                  {seasons.map((season) => (
                    <MenuItem key={season.id} value={season.id}>
                      {season.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label="Question"
                name="question"
                value={newQuestion.question}
                onChange={handleInputChange}
                margin="normal"
                required
              />

              {newQuestion.options.map((option, index) => (
                <TextField
                  key={index}
                  fullWidth
                  label={`Option ${index + 1}`}
                  value={option}
                  onChange={(e) => handleOptionChange(index, e.target.value)}
                  margin="normal"
                  required
                />
              ))}

              <FormControl fullWidth margin="normal">
                <InputLabel id="correct-answer-label">Correct Answer</InputLabel>
                <Select
                  labelId="correct-answer-label"
                  id="correct-answer"
                  value={newQuestion.correctAnswer}
                  onChange={(e) => setNewQuestion(prev => ({
                    ...prev,
                    correctAnswer: e.target.value as string
                  }))}
                  label="Correct Answer"
                  required
                >
                  {newQuestion.options.map((option, index) => (
                    <MenuItem 
                      key={index} 
                      value={option}
                      disabled={!option.trim()}
                    >
                      {option || `Option ${index + 1}`}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                <Button 
                  type="submit" 
                  variant="contained" 
                  color="primary"
                  disabled={isLoading}
                >
                  {isLoading ? <CircularProgress size={24} /> : 'Add Question'}
                </Button>
              </Box>
            </form>
          </Paper>

          <Typography variant="h6" gutterBottom>
            Existing Questions
          </Typography>
          <Paper>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Question</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Difficulty</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {questions.length > 0 ? (
                    questions.map((question) => (
                      <TableRow key={question.id}>
                        <TableCell>{question.question}</TableCell>
                        <TableCell>{question.category}</TableCell>
                        <TableCell>{question.difficulty}</TableCell>
                        <TableCell>
                          <IconButton 
                            color="error" 
                            onClick={() => question.id && handleDeleteQuestion(question.id)}
                            disabled={isLoading}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        No questions found. Add a question to get started.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <SeasonManager />
      </TabPanel>
    </Box>
  );
};

export default AdminPanel;