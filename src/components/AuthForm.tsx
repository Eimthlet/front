import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, register } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { jwtDecode } from 'jwt-decode';
import { Checkbox, FormControlLabel, Link, IconButton } from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import './AuthForm.css';

interface AuthFormProps {
  mode?: 'login' | 'register';
}

interface JwtPayload {
  id: number;
  email: string;
  isAdmin?: boolean;
  exp?: number;
}

const AuthForm: React.FC<AuthFormProps> = ({ mode = 'login' }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentMode, setCurrentMode] = useState<'login' | 'register'>(mode);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const navigate = useNavigate();
  const { login: authLogin } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Basic validation
    if (!email) {
      setError('Email is required');
      setLoading(false);
      return;
    }

    if (currentMode === 'register') {
      if (!acceptedTerms) {
        setError('Please accept the Terms and Conditions');
        setLoading(false);
        return;
      }

      if (password !== confirmPassword) {
        setError('Passwords do not match');
        setLoading(false);
        return;
      }

      if (!username.trim()) {
        setError('Username is required');
        setLoading(false);
        return;
      }

      try {
        const response = await register(username, email, password);
        const { user, token, refreshToken } = response;
        
        localStorage.setItem('token', token);
        localStorage.setItem('refreshToken', refreshToken);
        
        const decodedToken = jwtDecode(token) as JwtPayload;
        const isAdmin = decodedToken.isAdmin || false;

        authLogin({
          id: user.id,
          username: user.username,
          role: isAdmin ? 'admin' : 'user',
          token
        });

        navigate(isAdmin ? '/admin' : '/quiz', { replace: true });
      } catch (err: any) {
        console.error('Registration error:', err);
        setError(err.message || 'Registration failed');
        setLoading(false);
      }
      return;
    }

    // Login flow
    try {
      const response = await login(email, password);
      const { user, token, refreshToken } = response;
      
      localStorage.setItem('token', token);
      localStorage.setItem('refreshToken', refreshToken);
      
      const decodedToken = jwtDecode(token) as JwtPayload;
      const isAdmin = decodedToken.isAdmin || false;

      authLogin({
        id: user.id,
        username: user.username,
        role: isAdmin ? 'admin' : 'user',
        token
      });

      navigate(isAdmin ? '/admin' : '/quiz', { replace: true });
    } catch (err: any) {
      console.error('Authentication error:', err);
      setError(err.message || 'Authentication failed');
      setLoading(false);
    }
  };

  const handleSwitchMode = () => {
    setCurrentMode(currentMode === 'login' ? 'register' : 'login');
    setError('');
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  return (
    <div className="auth-form-container">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h2>{currentMode === 'login' ? 'Login' : 'Register'}</h2>
        {currentMode === 'register' && (
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
            disabled={loading}
          />
        )}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          disabled={loading}
        />
        <div className="password-input">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            disabled={loading}
          />
          <IconButton
            onClick={() => setShowPassword(!showPassword)}
            edge="end"
            className="password-toggle"
          >
            {showPassword ? <VisibilityOff /> : <Visibility />}
          </IconButton>
        </div>
        {currentMode === 'register' && (
          <>
            <div className="password-input">
              <input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
              />
              <IconButton
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                edge="end"
                className="password-toggle"
              >
                {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </div>
            <FormControlLabel
              control={
                <Checkbox
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  disabled={loading}
                  sx={{
                    color: '#43cea2',
                    '&.Mui-checked': {
                      color: '#43cea2',
                    },
                  }}
                />
              }
              label={
                <span style={{ fontSize: '0.9rem' }}>
                  I accept the{' '}
                  <Link
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      alert('Terms and Conditions: This quiz application is for educational purposes only. By accepting these terms, you agree to use the application responsibly and acknowledge that your quiz results and personal information will be stored securely.');
                    }}
                    sx={{
                      color: '#43cea2',
                      textDecoration: 'underline',
                      '&:hover': {
                        color: '#185a9d',
                      },
                    }}
                  >
                    Terms and Conditions
                  </Link>
                </span>
              }
              sx={{ marginY: 1 }}
            />
          </>
        )}
        <button 
          type="submit" 
          disabled={loading || (currentMode === 'register' && !acceptedTerms)}
        >
          {loading ? (
            currentMode === 'login' ? 'Logging in...' : 'Processing...'
          ) : (
            currentMode === 'login' ? 'Login' : 'Register'
          )}
        </button>
        <div className="switch-mode">
          {currentMode === 'login' ? (
            <span>Don't have an account? <button type="button" onClick={handleSwitchMode}>Register</button></span>
          ) : (
            <span>Already have an account? <button type="button" onClick={handleSwitchMode}>Login</button></span>
          )}
        </div>
        {error && <div className="auth-error">{error}</div>}
      </form>
    </div>
  );
};

export default AuthForm;
