import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, TextField, Select, MenuItem, FormControl, InputLabel, CircularProgress } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import { jwtDecode } from 'jwt-decode';

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
interface QuestionsResponse {
  questions: Question[];
}

interface QuestionResponse {
  question: Question;
}

// Define props interface
interface AdminPanelProps {}

// AdminPanel component with full type annotations
const AdminPanel: React.FC<AdminPanelProps> = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Debug token information
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decoded = jwtDecode<JwtPayload>(token);
        console.log('Token debug info:', {
          decoded,
          isAdmin: decoded.isAdmin,
          exp: decoded.exp,
          currentTime: Math.floor(Date.now() / 1000),
          isExpired: decoded.exp ? decoded.exp < Math.floor(Date.now() / 1000) : false
        });
      } catch (err) {
        console.error('Error decoding token:', err);
      }
    } else {
      console.log('No token found in localStorage');
    }

    // Check if user is admin
    if (!isAdmin()) {
      console.log('Non-admin user attempting to access admin panel');
      navigate('/login');
      return;
    }

    // Fetch questions when component mounts
    const fetchQuestions = async () => {
      try {
        // Log the current token for debugging
        const token = localStorage.getItem('token');
        console.log('Fetching questions with token:', {
          exists: !!token,
          length: token?.length,
          firstChars: token?.substring(0, 10)
        });

        const response = await api.get<QuestionsResponse>('/api/questions');
        const typedResponse = response.data as QuestionsResponse;
        setQuestions(typedResponse.questions);
        setIsLoading(false);
      } catch (err: any) {
        console.error('Error fetching questions:', {
          status: err.response?.status,
          statusText: err.response?.statusText,
          data: err.response?.data,
          headers: err.response?.headers
        });

        if (err.response?.status === 401) {
          setError('Unauthorized: Please log in as an admin. Your session may have expired.');
        } else if (err.response?.status === 403) {
          setError('Forbidden: Admin access required. Your account does not have admin privileges.');
        } else {
          setError(`Failed to fetch questions: ${err.response?.data?.error || err.message}`);
        }
        setIsLoading(false);
      }
    };

    fetchQuestions();
  }, [isAdmin, navigate]);

  // Delete a question
  const handleDeleteQuestion = async (questionId: string) => {
    try {
      console.log('Attempting to delete question:', questionId);
      await api.delete(`/api/admin/questions/${questionId}`);
      setQuestions(prevQuestions => prevQuestions.filter(q => q.id !== questionId));
      setSuccess('Question deleted successfully');
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Error deleting question:', {
        questionId,
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data
      });
      
      if (err.response?.status === 401) {
        setError('Unauthorized: Please log in again as admin');
      } else if (err.response?.status === 403) {
        setError('Forbidden: Admin access required');
      } else {
        setError(`Failed to delete question: ${err.response?.data?.error || err.message}`);
      }
      
      setTimeout(() => setError(''), 3000);
    }
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

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  try {
    // Format the question data to match server expectations
    const questionData = {
      question: newQuestion.question,
      options: newQuestion.options,
      correct_answer: newQuestion.correctAnswer,
      category: newQuestion.category,
      difficulty: newQuestion.difficulty,
      time_limit: newQuestion.timeLimit
    };

    console.log('Submitting question:', questionData);
    
    const response = await api.post<QuestionResponse>('/api/admin/questions', questionData);
    const typedResponse = response.data as QuestionResponse;
    setQuestions(prevQuestions => [...prevQuestions, typedResponse.question]);
    
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
    
    // Clear success message after 3 seconds
    setTimeout(() => setSuccess(''), 3000);
  } catch (err: any) {
    console.error('Error adding question:', err);
    setError(err.response?.data?.error || err.message || 'Failed to add question');
    
    // Clear error message after 3 seconds
    setTimeout(() => setError(''), 3000);
  }
};

  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="h4" sx={{ mb: 4, fontWeight: 600 }}>
        Admin Panel
      </Typography>
      
      {/* Error and Success Messages */}
      {error && (
        <Box sx={{ 
          p: 2, 
          mb: 3, 
          borderRadius: 1,
          backgroundColor: 'rgba(255, 107, 107, 0.1)',
          color: '#ff6b6b'
        }}>
          {error}
        </Box>
      )}
      {success && (
        <Box sx={{ 
          p: 2, 
          mb: 3, 
          borderRadius: 1,
          backgroundColor: 'rgba(67, 206, 162, 0.1)',
          color: '#43cea2'
        }}>
          {success}
        </Box>
      )}

      {isLoading ? (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '200px' 
        }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Add Question Form */}
          <Box component="form" onSubmit={handleSubmit} sx={{ mb: 6 }}>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
              Add New Question
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <TextField
                label="Question"
                value={newQuestion.question}
                onChange={(e) => setNewQuestion({ ...newQuestion, question: e.target.value })}
                required
                fullWidth
              />

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Typography variant="subtitle1">Options:</Typography>
                {newQuestion.options.map((option, index) => (
                  <TextField
                    key={index}
                    label={`Option ${index + 1}`}
                    value={option}
                    onChange={(e) => {
                      const newOptions = [...newQuestion.options];
                      newOptions[index] = e.target.value;
                      setNewQuestion({ ...newQuestion, options: newOptions });
                    }}
                    required
                    fullWidth
                  />
                ))}
              </Box>

              <FormControl fullWidth required>
                <InputLabel>Correct Answer</InputLabel>
                <Select
                  value={newQuestion.correctAnswer}
                  onChange={(e) => setNewQuestion({ ...newQuestion, correctAnswer: e.target.value })}
                  label="Correct Answer"
                >
                  <MenuItem value="">
                    <em>Select correct answer</em>
                  </MenuItem>
                  {newQuestion.options.map((option, index) => (
                    <MenuItem key={index} value={option} disabled={!option}>
                      {option || `Option ${index + 1}`}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
                <TextField
                  label="Category"
                  value={newQuestion.category}
                  onChange={(e) => setNewQuestion({ ...newQuestion, category: e.target.value })}
                  required
                  fullWidth
                />

                <FormControl fullWidth required>
                  <InputLabel>Difficulty</InputLabel>
                  <Select
                    value={newQuestion.difficulty}
                    onChange={(e) => setNewQuestion({ ...newQuestion, difficulty: e.target.value })}
                    label="Difficulty"
                  >
                    <MenuItem value="easy">Easy</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="hard">Hard</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              <TextField
                label="Time Limit (seconds)"
                type="number"
                value={newQuestion.timeLimit}
                onChange={(e) => setNewQuestion({ ...newQuestion, timeLimit: Number(e.target.value) })}
                required
                fullWidth
                inputProps={{ min: 10, max: 300 }}
              />

              <Button 
                type="submit" 
                variant="contained" 
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
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                >
                  <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                    {question?.question || 'Untitled Question'}
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                      Category: {question?.category || 'General'}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                      Difficulty: {question?.difficulty || 'Medium'}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                      Time Limit: {question?.timeLimit || 30}s
                    </Typography>
                  </Box>
                  <Button 
                    onClick={() => question.id && handleDeleteQuestion(question.id)}
                    sx={{
                      bgcolor: 'rgba(255, 107, 107, 0.1)',
                      color: '#ff6b6b',
                      '&:hover': {
                        bgcolor: 'rgba(255, 107, 107, 0.2)',
                      }
                    }}
                  >
                    Delete
                  </Button>
                </Box>
              ))}
            </Box>
          </Box>
        </>
      )}
    </Box>
  );
};

export default AdminPanel;
