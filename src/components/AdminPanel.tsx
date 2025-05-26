import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  TextField, 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel, 
  CircularProgress,
  Tabs,
  Tab,
  Paper,
  Alert,
  Snackbar
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import { jwtDecode } from 'jwt-decode';
import SeasonManagement from './SeasonManagement';

// Define Question interface with all required fields
interface Question {
  id?: string;
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
    status: number;
    statusText: string;
    data: {
      error?: string;
      message?: string;
      details?: string;
    };
    headers?: Record<string, string>;
  };
  message: string;
  name: string;
  stack?: string;
}

interface ErrorState {
  message: string;
  details?: string;
}

interface QuestionsResponse {
  data: {
    questions: Question[];
  };
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

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `admin-tab-${index}`,
    'aria-controls': `admin-tabpanel-${index}`,
  };
}

const AdminPanel: React.FC<AdminPanelProps> = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [error, setError] = useState<ErrorState | null>(null);
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);  // Added for tab control
  
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  // Initialize state with full type definition
  const [newQuestion, setNewQuestion] = useState<Question>({
    question: '',
    options: ['', '', '', ''],
    correctAnswer: '',
    timeLimit: 30,
    category: '',
    difficulty: 'easy'
  });

  useEffect(() => {
    // Check if user is authenticated and has admin privileges
    console.log('Admin panel access check:', { isAdmin });

    // Check if user is admin
    if (!isAdmin) {
      console.log('Non-admin user attempting to access admin panel');
      navigate('/login');
      return;
    }

    // Fetch questions when component mounts
    const fetchQuestions = async () => {
      try {
        setIsLoading(true);
        const response = await api.get<{questions?: Question[]; data?: {questions?: Question[]}}>
          ('/api/admin/questions');
        
        // Check the response format and extract questions
        if (response?.data?.questions) {
          // Format matches { questions: [...] }
          setQuestions(response.data.questions);
        } else if (response?.data?.data?.questions) {
          // Format matches { data: { questions: [...] } }
          setQuestions(response.data.data.questions);
        } else if (Array.isArray(response?.data)) {
          // Format matches direct array
          setQuestions(response.data as Question[]);
        } else {
          console.warn('Unexpected response format:', response);
          setQuestions([]);
        }
        
        setError(null);
      } catch (err: unknown) {
        console.error('Error fetching questions:', err);
        const apiError = err as ApiError;
        setError({ 
          message: apiError.response?.data?.error || 
                 apiError.response?.data?.message || 
                 apiError.message ||
                 'Failed to fetch questions',
          details: apiError.response?.data?.details
        });
        setQuestions([]); // Ensure questions is set to empty array on error
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuestions();
  }, [isAdmin, navigate]);

  // Delete a question
  const handleDeleteQuestion = async (questionId: string) => {
    try {
      await api.delete(`/api/admin/questions/${questionId}`);
      setQuestions(prevQuestions => prevQuestions.filter(q => q.id !== questionId));
      setSuccess('Question deleted successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: unknown) {
      console.error('Error deleting question:', err);
      const apiError = err as ApiError;
      setError({ 
        message: apiError.response?.data?.error || apiError.message,
        details: apiError.response?.data?.details
      });
      setTimeout(() => setError(null), 3000);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Create a local copy of the form data to avoid TypeScript errors
      const formData = {...newQuestion};
      
      // Create question data from the form data
      const questionData = {
        question: formData.question,
        options: formData.options,
        correct_answer: formData.correctAnswer,
        category: formData.category,
        difficulty: formData.difficulty,
        time_limit: formData.timeLimit
      };

      console.log('Submitting question:', questionData);
      
      const response = await api.post<{question?: Question; data?: {question?: Question}}>
        ('/api/admin/questions', questionData);
      
      // Handle different response formats
      let addedQuestion: Question;
      if (response?.data?.question) {
        addedQuestion = response.data.question;
      } else if (response?.data?.data?.question) {
        addedQuestion = response.data.data.question;
      } else {
        // If the response format doesn't match expected structure,
        // use the data we sent with a generated ID
        addedQuestion = {
          question: questionData.question,
          options: questionData.options,
          correctAnswer: questionData.correct_answer,
          category: questionData.category,
          difficulty: questionData.difficulty,
          timeLimit: questionData.time_limit,
          id: `temp-${Date.now()}`
        };
      }
      
      setQuestions(prevQuestions => [...prevQuestions, addedQuestion]);
      
      // Reset form
      setNewQuestion({
        question: '',
        options: ['', '', '', ''],
        correctAnswer: '',
        timeLimit: 30,
        category: '',
        difficulty: 'easy'
      });
      
      setSuccess('Question added successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: unknown) {
      console.error('Error adding question:', err);
      const apiError = err as ApiError;
      setError({ 
        message: apiError.response?.data?.error || apiError.message || 'Failed to add question',
        details: apiError.response?.data?.details
      });
      setTimeout(() => setError(null), 3000);
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

              <Box component="form" onSubmit={handleSubmit}>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mb: 2 }}>
                  <TextField
                    label="Question"
                    value={newQuestion.question}
                    onChange={(e) => setNewQuestion({ ...newQuestion, question: e.target.value })}
                    required
                    fullWidth
                    InputProps={{ style: { color: 'white' } }}
                    InputLabelProps={{ style: { color: 'rgba(255, 255, 255, 0.7)' } }}
                    sx={{ mb: 2 }}
                  />

                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel id="category-label" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                      Category
                    </InputLabel>
                    <Select
                      labelId="category-label"
                      value={newQuestion.category}
                      onChange={(e) => setNewQuestion({ ...newQuestion, category: e.target.value })}
                      required
                      sx={{ color: 'white' }}
                    >
                      <MenuItem value="Car Brands">Car Brands</MenuItem>
                      <MenuItem value="Car Models">Car Models</MenuItem>
                      <MenuItem value="Car Technology">Car Technology</MenuItem>
                      <MenuItem value="Car History">Car History</MenuItem>
                      <MenuItem value="General Knowledge">General Knowledge</MenuItem>
                    </Select>
                  </FormControl>
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mb: 2 }}>
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel id="difficulty-label" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                      Difficulty
                    </InputLabel>
                    <Select
                      labelId="difficulty-label"
                      value={newQuestion.difficulty}
                      onChange={(e) => setNewQuestion({ ...newQuestion, difficulty: e.target.value })}
                      required
                      sx={{ color: 'white' }}
                    >
                      <MenuItem value="Easy">Easy</MenuItem>
                      <MenuItem value="Medium">Medium</MenuItem>
                      <MenuItem value="Hard">Hard</MenuItem>
                    </Select>
                  </FormControl>

                  <TextField
                    label="Time Limit (seconds)"
                    type="number"
                    value={newQuestion.timeLimit}
                    onChange={(e) => setNewQuestion({ ...newQuestion, timeLimit: Number(e.target.value) })}
                    required
                    fullWidth
                    InputProps={{ style: { color: 'white' } }}
                    InputLabelProps={{ style: { color: 'rgba(255, 255, 255, 0.7)' } }}
                    sx={{ mb: 2 }}
                  />
                </Box>

                <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
                  Options
                </Typography>

                {newQuestion.options.map((option, index) => (
                  <Box key={index} sx={{ display: 'flex', mb: 2, gap: 1 }}>
                    <TextField
                      label={`Option ${index + 1}`}
                      value={option}
                      onChange={(e) => {
                        const newOptions = [...newQuestion.options];
                        newOptions[index] = e.target.value;
                        setNewQuestion({ ...newQuestion, options: newOptions });
                      }}
                      required
                      fullWidth
                      InputProps={{ style: { color: 'white' } }}
                      InputLabelProps={{ style: { color: 'rgba(255, 255, 255, 0.7)' } }}
                    />
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={() => {
                        const newOptions = [...newQuestion.options];
                        newOptions.splice(index, 1);
                        setNewQuestion({ ...newQuestion, options: newOptions });
                      }}
                      sx={{ minWidth: '40px', ml: 1 }}
                    >
                      X
                    </Button>
                  </Box>
                ))}

                <Button
                  type="button"
                  onClick={() => setNewQuestion({ ...newQuestion, options: [...newQuestion.options, ''] })}
                  variant="outlined"
                  sx={{ 
                    mt: 1, 
                    mb: 3,
                    color: 'white',
                    borderColor: 'white',
                    '&:hover': {
                      borderColor: 'white',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)'
                    }
                  }}
                >
                  Add Option
                </Button>

                <FormControl fullWidth sx={{ mb: 3 }}>
                  <InputLabel id="correct-answer-label" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                    Correct Answer
                  </InputLabel>
                  <Select
                    labelId="correct-answer-label"
                    value={newQuestion.correctAnswer}
                    onChange={(e) => setNewQuestion({ ...newQuestion, correctAnswer: e.target.value })}
                    required
                    sx={{ color: 'white' }}
                  >
                    {newQuestion.options.map((option, index) => (
                      <MenuItem key={index} value={option}>
                        {option}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

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
                {questions?.map((question) => (
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
                ))}
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
