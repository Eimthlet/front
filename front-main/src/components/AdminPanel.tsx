import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/apiClient';
import SeasonManager from './SeasonManager';
import { 
  Box, 
  Button, 
  FormControl, 
  IconButton, 
  InputLabel, 
  MenuItem, 
  Paper, 
  Select, 
  SelectChangeEvent,
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  TextField, 
  Typography, 
  OutlinedInput, 
  CircularProgress, 
  Alert, 
  Tabs, 
  Tab
} from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import DeleteIcon from '@mui/icons-material/Delete';


// Define interfaces
interface Question {
  id?: number;
  question_text: string;  // Backend uses question_text
  options: string[];
  correct_answer: string;  // Backend uses correct_answer
  time_limit?: number;    // Optional as it's not in backend
  category: string;
  difficulty: string;
  
  // For backward compatibility with existing code
  question?: string;
  correctAnswer?: string;
  timeLimit?: number;
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
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [adminCheckFailed, setAdminCheckFailed] = useState(false);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [hasFetchedQuestions, setHasFetchedQuestions] = useState(false);
  const [newQuestion, setNewQuestion] = useState<Question>({
    question_text: '',
    options: ['', '', '', ''],
    correct_answer: '',
    time_limit: 30,
    category: 'General',
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
    console.log('fetchQuestions called with selectedSeasonId:', selectedSeasonId);
    if (!selectedSeasonId) {
      console.log('No selectedSeasonId, returning early');
      setHasFetchedQuestions(false);
      return;
    }
    
    try {
      setIsLoading(true);
      clearError();
      setHasFetchedQuestions(false);
      console.log('Fetching questions for season:', selectedSeasonId);
      const response = await api.get(`/admin/seasons/${selectedSeasonId}/questions`);
      console.log('Questions API response:', response);
      
      // The response should be an array of questions
      const questionsData = Array.isArray(response?.data) ? response.data : [];
      console.log('Processed questions data:', questionsData);
      setQuestions(questionsData);
      setHasFetchedQuestions(true);
    } catch (error) {
      console.error('Error fetching questions:', error);
      updateError('Error', 'Failed to load questions. The season may not have any questions yet.');
      setQuestions([]);
      setHasFetchedQuestions(false);
    } finally {
      setIsLoading(false);
    }
  }, [selectedSeasonId, updateError, clearError]);

  // Fetch seasons
  const fetchSeasons = useCallback(async () => {
    try {
      console.log('Fetching seasons...');
      clearError();
      const response = await api.get('/admin/seasons');
      console.log('Seasons API response:', response);
      
      // Handle response properly - response data could be in response.data or response.data.data
      let seasonsData = [];
      if (Array.isArray(response?.data)) {
        seasonsData = response.data;
      } else if (response?.data?.data && Array.isArray(response.data.data)) {
        seasonsData = response.data.data;
      }
      
      console.log('Processed seasons data:', seasonsData);
      
      setSeasons(seasonsData);
      
      if (seasonsData.length > 0) {
        console.log('Setting selected season to first season:', seasonsData[0].id);
        setSelectedSeasonId(seasonsData[0].id);
      } else {
        console.log('No seasons available');
        setSelectedSeasonId(null);
      }
    } catch (error) {
      console.error('Error fetching seasons:', error);
      updateError('Error', 'Failed to load seasons');
      setSeasons([]);
      setSelectedSeasonId(null);
    }
  }, [updateError, clearError]);

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
      console.log('Fetching initial data...');
      try {
        await fetchSeasons();
      } catch (error) {
        console.error('Error in fetchInitialData:', error);
      }
    };
    
    if (!isVerifying && isAdmin && !adminCheckFailed) {
      console.log('Conditions met, fetching initial data');
      fetchInitialData();
    } else {
      console.log('Conditions not met, not fetching initial data:', {
        isVerifying,
        isAdmin,
        adminCheckFailed
      });
    }
  }, [fetchSeasons, isVerifying, isAdmin, adminCheckFailed]);

  // Fetch questions when selectedSeasonId changes
  useEffect(() => {
    console.log('useEffect - selectedSeasonId:', selectedSeasonId, 'isVerifying:', isVerifying, 'isAdmin:', isAdmin, 'adminCheckFailed:', adminCheckFailed);
    if (selectedSeasonId && !isVerifying && isAdmin && !adminCheckFailed) {
      console.log('Fetching questions...');
      fetchQuestions().catch(error => {
        console.error('Error in fetchQuestions:', error);
      });
    }
  }, [selectedSeasonId, fetchQuestions, isVerifying, isAdmin, adminCheckFailed]);

  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Handle input changes for text fields
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Map frontend field names to backend field names
    const fieldMap: Record<string, string> = {
      'question': 'question_text',
      'correctAnswer': 'correct_answer',
      'timeLimit': 'time_limit'
    };
    
    const backendField = fieldMap[name] || name;
    
    setNewQuestion(prev => ({
      ...prev,
      [name]: value, // Keep original for form binding
      [backendField]: value // Set backend field
    }));
  };

  // Handle select changes for Material-UI Select components
  const handleSelectChange = (e: SelectChangeEvent<string>) => {
    const { name, value } = e.target as { name: string; value: string };
    
    // Map frontend field names to backend field names
    const fieldMap: Record<string, string> = {
      'question': 'question_text',
      'correctAnswer': 'correct_answer',
      'timeLimit': 'time_limit'
    };
    
    const backendField = fieldMap[name] || name;
    
    setNewQuestion(prev => ({
      ...prev,
      [name]: value, // Keep original for form binding
      [backendField]: value // Set backend field
    }));
  };

  // Handle option change
  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...newQuestion.options];
    newOptions[index] = value;
    
    setNewQuestion(prev => {
      // If the correct answer was the option being edited, update it
      const currentCorrectAnswer = prev.correct_answer || prev.correctAnswer;
      const shouldUpdateCorrectAnswer = currentCorrectAnswer === prev.options[index];
      
      return {
        ...prev,
        options: newOptions,
        correct_answer: shouldUpdateCorrectAnswer ? value : prev.correct_answer,
        correctAnswer: shouldUpdateCorrectAnswer ? value : prev.correctAnswer
      };
    });
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

      // Submit the question - ensure all fields match backend expectations
      const questionPayload = {
        question_text: newQuestion.question_text || newQuestion.question || '',
        options: newQuestion.options.filter(opt => opt.trim() !== ''), // Remove empty options
        correct_answer: newQuestion.correct_answer || newQuestion.correctAnswer || '',
        category: newQuestion.category || 'General',
        difficulty: newQuestion.difficulty || 'Medium',
        time_limit: Number(newQuestion.time_limit || newQuestion.timeLimit || 30) // Ensure number type
      };

      // Submit the question - wrap in a questions array as expected by the server
      await api.post(`/admin/seasons/${selectedSeasonId}/questions`, { 
        questions: [questionPayload]
      });
      updateSuccess('Question added successfully!');
      await fetchQuestions();
      
      // Reset form
      setNewQuestion({
        question_text: '',  // Use backend field name
        question: '',       // Keep for backward compatibility
        options: ['', '', '', ''],
        correct_answer: '',  // Use backend field name
        correctAnswer: '',   // Keep for backward compatibility
        time_limit: 30,      // Use backend field name
        timeLimit: 30,       // Keep for backward compatibility
        category: 'General', // Match backend default
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
      clearError();
      
      // Make sure to include the season ID in the URL
      if (!selectedSeasonId) {
        throw new Error('No season selected');
      }
      
      // Use the correct endpoint format based on the server implementation
      await api.delete(`/admin/questions/${questionId}`);
      
      // Refresh the questions list after successful deletion
      await fetchQuestions();
      updateSuccess('Question deleted successfully!');
    } catch (error) {
      console.error('Error deleting question:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete question';
      updateError('Error', errorMessage);
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
          {seasons.length === 0 && !isLoading && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              No seasons available. Please create a season first.
            </Alert>
          )}
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
                name="question_text"
                value={newQuestion.question_text || ''}
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
                  name="correctAnswer"
                  value={newQuestion.correct_answer || newQuestion.correctAnswer || ''}
                  onChange={handleSelectChange}
                  input={<OutlinedInput label="Correct Answer" />}
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

              <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                <FormControl fullWidth>
                  <InputLabel>Category</InputLabel>
                  <Select
                    name="category"
                    value={newQuestion.category || 'General'}
                    onChange={handleSelectChange}
                    input={<OutlinedInput label="Category" />}
                  >
                    <MenuItem value="General">General</MenuItem>
                    <MenuItem value="Science">Science</MenuItem>
                    <MenuItem value="History">History</MenuItem>
                    <MenuItem value="Sports">Sports</MenuItem>
                    <MenuItem value="Entertainment">Entertainment</MenuItem>
                  </Select>
                </FormControl>

                <FormControl fullWidth>
                  <InputLabel>Difficulty</InputLabel>
                  <Select
                    name="difficulty"
                    value={newQuestion.difficulty || 'Medium'}
                    onChange={handleSelectChange}
                    input={<OutlinedInput label="Difficulty" />}
                  >
                    <MenuItem value="Easy">Easy</MenuItem>
                    <MenuItem value="Medium">Medium</MenuItem>
                    <MenuItem value="Hard">Hard</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  fullWidth
                  label="Time Limit (seconds)"
                  name="timeLimit"
                  type="number"
                  value={newQuestion.time_limit || newQuestion.timeLimit || 30}
                  onChange={handleInputChange}
                  inputProps={{ min: 10, max: 300 }}
                />
              </Box>

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
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        <CircularProgress size={24} />
                        <Typography variant="body2" sx={{ mt: 1 }}>Loading questions...</Typography>
                      </TableCell>
                    </TableRow>
                  ) : !hasFetchedQuestions ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        <Typography variant="body2">Select a season to view questions</Typography>
                      </TableCell>
                    </TableRow>
                  ) : questions.length > 0 ? (
                    questions.map((question) => (
                      <TableRow key={question.id}>
                        <TableCell>{question.question_text || question.question}</TableCell>
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