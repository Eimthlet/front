import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import SeasonManagement from './SeasonManagement';
import {
  Box,
  Button,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
  Tabs,
  Tab,
  SelectChangeEvent
} from '@mui/material';

// Define Season interface with all required fields
interface Season {
  id: number;
  name: string;
  is_active: boolean;
}

// Define Question interface with all required fields
interface Question {
  id?: number;
  question: string;
  options: string[];
  correctAnswer: string;
  timeLimit: number;
  category: string;
  difficulty: string;
}

// Add JWT payload interface
interface JwtPayload {
  id: string | number;
  email: string;
  isAdmin: boolean;
  exp?: number;
}

// Add these interfaces after the Question interface
interface ApiError {
  response?: {
    data?: {
      error?: string;
      details?: string;
    };
  };
  message?: string;
}

interface ApiResponse<T> {
  data: T;
  message?: string;
}

interface ErrorState {
  message: string;
  details?: string;
}

interface QuestionsResponse {
  questions: Question[];
}

interface QuestionResponse {
  data: {
    question: Question;
  };
}

// Define props interface
interface AdminPanelProps {}

// AdminPanel component with full type annotations
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
  const [questions, setQuestions] = useState<Question[]>([]);
  const [error, setError] = useState<ErrorState | null>(null);
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | null>(null);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [newQuestion, setNewQuestion] = useState<Question>({
    question: '',
    options: ['', '', '', ''],
    correctAnswer: '',
    timeLimit: 30,
    category: 'General Knowledge',
    difficulty: 'Medium'
  })
  
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  // Fetch seasons when component mounts
  useEffect(() => {
    const fetchSeasons = async () => {
      try {
        const response = await api.get<Season[]>('/admin/seasons');
        const seasonsData = response.data;
        setSeasons(seasonsData);
        // Set the first active season as selected
        const activeSeason = seasonsData.find(s => s.is_active);
        if (activeSeason) {
          setSelectedSeasonId(activeSeason.id);
        }
      } catch (error) {
        console.error('Error fetching seasons:', error);
        setError({
          message: 'Failed to fetch seasons',
          details: error instanceof Error ? error.message : undefined
        });
      }
    };
    fetchSeasons();
  }, []);

  // Function to fetch questions
  const fetchQuestions = async () => {
    try {
      setIsLoading(true);
      const response = await api.get<QuestionsResponse | Question[]>('/admin/questions');
      
      // Check if response.data is an array or has a questions property
      if (Array.isArray(response.data)) {
        setQuestions(response.data as Question[]);
      } else if (response.data && 'questions' in response.data && Array.isArray((response.data as QuestionsResponse).questions)) {
        // If the response has a nested questions array
        setQuestions((response.data as QuestionsResponse).questions);
      } else {
        console.error('Unexpected API response format:', response.data);
        setQuestions([]);
        setError({
          message: 'Failed to load questions',
          details: 'Unexpected data format received from server'
        });
      }
    } catch (err: unknown) {
      console.error('Error fetching questions:', err);
      const apiError = err as ApiError;
      setError({ 
        message: apiError.message || 'Failed to fetch questions',
        details: apiError.response?.data?.details
      });
      setQuestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch questions when component mounts
  useEffect(() => {
    fetchQuestions();
  }, []);

  // Check if user is admin and redirect if not
  useEffect(() => {
    // Check if user is authenticated and has admin privileges
    console.log('Admin panel access check:', { isAdmin });

    // Check if user is admin
    if (!isAdmin) {
      console.log('Non-admin user attempting to access admin panel');
      navigate('/login');
    }
  }, [isAdmin, navigate]);

  // Delete a question
  const handleDeleteQuestion = async (questionId: number) => {
    try {
      await api.delete(`/admin/questions/${questionId}`);
      setSuccess('Question deleted successfully');
      fetchQuestions();
    } catch (err: unknown) {
      const apiError = err as ApiError;
      setError({
        message: apiError.message || 'Failed to delete question',
        details: apiError.response?.data?.details
      });
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSeasonId) {
      setError({ message: 'Please select a season' });
      return;
    }
    const questionData = {
      question: newQuestion.question,
      options: newQuestion.options,
      correctAnswer: newQuestion.correctAnswer,  // Changed from correct_answer to correctAnswer to match server expectations
      timeLimit: newQuestion.timeLimit,          // Changed from time_limit to timeLimit to match server expectations
      category: newQuestion.category,
      difficulty: newQuestion.difficulty,
      season_id: selectedSeasonId
    };

    try {
      await api.post('/admin/questions', questionData);
      setSuccess('Question added successfully');
      setNewQuestion({
        question: '',
        options: ['', '', '', ''],
        correctAnswer: '',
        timeLimit: 30,
        category: 'General Knowledge',
        difficulty: 'Medium'
      });
      fetchQuestions();
    } catch (err: unknown) {
      const apiError = err as ApiError;
      setError({
        message: apiError.message || 'Failed to add question',
        details: apiError.response?.data?.details
      });
    }
  };

  return (
    <Box sx={{ 
      p: { xs: 2, md: 4 },
      maxWidth: '1200px', 
      mx: 'auto',
      minHeight: '100vh',
      background: 'linear-gradient(to right, rgba(24, 42, 115, 0.8), rgba(33, 138, 174, 0.8))',
      color: 'white'
    }}>
      <Typography variant="h4" component="h1" sx={{ mb: 4, fontWeight: 700 }}>
        Admin Dashboard
      </Typography>

      {/* Tab Navigation */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange} 
          aria-label="admin tabs"
          sx={{ 
            '& .MuiTab-root': { color: 'rgba(255, 255, 255, 0.7)' },
            '& .Mui-selected': { color: 'white' },
            '& .MuiTabs-indicator': { backgroundColor: 'white' }
          }}
        >
          <Tab label="Question Management" {...a11yProps(0)} />
          <Tab label="Season Management" {...a11yProps(1)} />
        </Tabs>
      </Box>

      {/* Question Management Tab */}
      <TabPanel value={tabValue} index={0}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <CircularProgress sx={{ color: 'white' }} />
          </Box>
        ) : (
          <Box>
            {error && (
              <Box sx={{ 
                p: 2, 
                mb: 3, 
                borderRadius: 2, 
                bgcolor: 'rgba(255, 0, 0, 0.1)', 
                border: '1px solid rgba(255, 0, 0, 0.3)' 
              }}>
                <Typography color="error">{error.message}</Typography>
                {error.details && <Typography variant="body2" color="error">{error.details}</Typography>}
              </Box>
            )}

            {success && (
              <Box sx={{ 
                p: 2, 
                mb: 3, 
                borderRadius: 2, 
                bgcolor: 'rgba(0, 255, 0, 0.1)', 
                border: '1px solid rgba(0, 255, 0, 0.3)' 
              }}>
                <Typography color="success.main">{success}</Typography>
              </Box>
            )}

            {/* Add Question Form */}
            <Box sx={{ 
              p: 3, 
              borderRadius: 2, 
              background: 'rgba(18, 18, 18, 0.8)',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)'
            }}>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                Add New Question
              </Typography>

              <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%', maxWidth: 600, mx: 'auto' }}>
                {/* Season Selection */}
                <FormControl fullWidth sx={{ mb: 3 }}>
                  <InputLabel id="season-select-label">Season</InputLabel>
                  <Select
                    labelId="season-select-label"
                    value={selectedSeasonId || ''}
                    onChange={(e) => setSelectedSeasonId(e.target.value as number)}
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
                  value={newQuestion.question}
                  onChange={(e) => setNewQuestion({ ...newQuestion, question: e.target.value })}
                  required
                  sx={{ mb: 3 }}
                />

                {/* Options */}
                <Box sx={{ mb: 4 }}>
                  <Typography variant="subtitle1" sx={{ mb: 2 }}>
                    Options
                  </Typography>
                  {newQuestion.options.map((option, index) => (
                    <TextField
                      key={index}
                      fullWidth
                      label={`Option ${index + 1}`}
                      value={option}
                      onChange={(e) => {
                        const newOptions = [...newQuestion.options];
                        newOptions[index] = e.target.value;
                        setNewQuestion({ ...newQuestion, options: newOptions });
                      }}
                      sx={{ mb: 2 }} /* Added margin bottom for spacing between options */
                      required={index === 0 || index === 1} /* First two options are required */
                    />
                  ))}
                </Box>
                
                {/* Correct Answer Selection */}
                <FormControl fullWidth sx={{ mb: 4 }}>
                  <InputLabel id="correct-answer-label">Correct Answer</InputLabel>
                  <Select
                    labelId="correct-answer-label"
                    value={newQuestion.correctAnswer || ''}
                    onChange={(e) => setNewQuestion({ ...newQuestion, correctAnswer: e.target.value })}
                    required
                  >
                    {newQuestion.options.filter(option => option.trim() !== '').map((option, index) => (
                      <MenuItem key={index} value={option}>
                        {option}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {/* Category */}
                <FormControl fullWidth sx={{ mb: 4 }}>
                  <InputLabel id="category-label">Category</InputLabel>
                  <Select
                    labelId="category-label"
                    value={newQuestion.category}
                    onChange={(e) => setNewQuestion({ ...newQuestion, category: e.target.value })}
                    required
                  >
                    <MenuItem value="Car Brands">Car Brands</MenuItem>
                    <MenuItem value="Car Models">Car Models</MenuItem>
                    <MenuItem value="Car Technology">Car Technology</MenuItem>
                    <MenuItem value="Car History">Car History</MenuItem>
                    <MenuItem value="General Knowledge">General Knowledge</MenuItem>
                  </Select>
                </FormControl>

                {/* Difficulty */}
                <FormControl fullWidth sx={{ mb: 4 }}>
                  <InputLabel id="difficulty-label">Difficulty</InputLabel>
                  <Select
                    labelId="difficulty-label"
                    value={newQuestion.difficulty}
                    onChange={(e) => setNewQuestion({ ...newQuestion, difficulty: e.target.value })}
                    required
                  >
                    <MenuItem value="Easy">Easy</MenuItem>
                    <MenuItem value="Medium">Medium</MenuItem>
                    <MenuItem value="Hard">Hard</MenuItem>
                  </Select>
                </FormControl>

                {/* Time Limit */}
                <TextField
                  fullWidth
                  label="Time Limit (seconds)"
                  type="number"
                  value={newQuestion.timeLimit}
                  onChange={(e) => setNewQuestion({ ...newQuestion, timeLimit: Number(e.target.value) })}
                  required
                  sx={{ mb: 4 }}
                  InputProps={{ inputProps: { min: 10, max: 120 } }}
                />

                <Button 
                  type="submit" 
                  variant="contained" 
                  fullWidth
                  sx={{ 
                    mt: 2,
                    bgcolor: 'rgba(67, 206, 162, 0.1)',
                    color: '#43cea2',
                    '&:hover': {
                      bgcolor: 'rgba(67, 206, 162, 0.2)',
                    }
                  }}
                >
                  Add Question
                </Button>
              </Box>
            </Box>

            {/* Questions List */}
            <Box sx={{ mt: 6 }}>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                Existing Questions
              </Typography>
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: { xs: '1fr', md: '1fr 1fr', lg: '1fr 1fr 1fr' },
                gap: 3 
              }}>
                {Array.isArray(questions) && questions.length > 0 ? questions.map((question) => (
                  <Box 
                    key={question.id}
                    sx={{
                      p: 3,
                      borderRadius: 2,
                      background: 'rgba(18, 18, 18, 0.8)',
                      backdropFilter: 'blur(10px)',
                      boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
                      position: 'relative'
                    }}
                  >
                    <Typography variant="h6" sx={{ mb: 2, pr: 4 }}>
                      {question.question}
                    </Typography>
                    
                    <Box sx={{ position: 'absolute', top: 12, right: 12 }}>
                      <Button 
                        variant="text" 
                        color="error"
                        onClick={() => handleDeleteQuestion(question.id)}
                        sx={{ minWidth: 'auto', p: 0.5 }}
                      >
                        X
                      </Button>
                    </Box>

                    <Typography variant="body2" sx={{ mb: 1, opacity: 0.7 }}>
                      Category: {question.category}
                    </Typography>
                    
                    <Typography variant="body2" sx={{ mb: 2, opacity: 0.7 }}>
                      Difficulty: {question.difficulty}
                    </Typography>

                    <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
                      Options:
                    </Typography>
                    
                    <Box component="ul" sx={{ pl: 2, mb: 2 }}>
                      {question.options.map((option, index) => (
                        <Typography 
                          component="li" 
                          key={index} 
                          sx={{ 
                            color: option === question.correctAnswer ? '#43cea2' : 'white',
                            fontWeight: option === question.correctAnswer ? 'bold' : 'normal'
                          }}
                        >
                          {option} {option === question.correctAnswer && '✓'}
                        </Typography>
                      ))}
                    </Box>
                  </Box>
                )) : (
                  <Box sx={{ p: 3, textAlign: 'center' }}>
                    <Typography variant="body1">
                      No questions found. Add your first question using the form above.
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          </Box>
        )}
      </TabPanel>

      {/* Season Management Tab */}
      <TabPanel value={tabValue} index={1}>
        <SeasonManagement />
      </TabPanel>
    </Box>
  );
};

export default AdminPanel;
