import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
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
  // Wait for PayChangu script to load before calling the popup
  function waitForPayChanguAndLaunch(config: any, setError: (msg: string) => void, setLoading: (loading: boolean) => void, retries = 10) {
    if (window.PaychanguCheckout) {
      window.PaychanguCheckout(config);
    } else if (retries > 0) {
      setTimeout(() => waitForPayChanguAndLaunch(config, setError, setLoading, retries - 1), 300);
    } else {
      setError('Payment system failed to load. Please refresh and try again.');
      setLoading(false);
    }
  }

  // Load PayChangu popup script if not already loaded
  React.useEffect(() => {
    if (!window.PaychanguCheckout) {
      const script = document.createElement('script');
      script.src = 'https://in.paychangu.com/js/popup.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState<number>(1000); // Default amount, adjust as needed
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentMode, setCurrentMode] = useState<'login' | 'register'>(mode as 'login' | 'register');
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
      if (!phone.trim()) {
        setError('Phone number is required');
        setLoading(false);
        return;
      }
      if (!amount || amount <= 0) {
        setError('Amount is required and must be positive');
        setLoading(false);
        return;
      }
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
        // 1. Send registration info to backend and get tx_ref, public_key, etc.
        const endpoint = '/auth/register';
        const payload = { username, email, password, phone, amount };
        
        interface RegisterResponse {
          tx_ref: string;
          public_key: string;
          amount: number;
          email: string;
        }
        
        const response = await api.post<RegisterResponse>(endpoint, payload);
        const regResult = response.data;
        
        if (!regResult.tx_ref || !regResult.public_key) {
          setError('Registration initiation failed. Please try again.');
          setLoading(false);
          return;
        }
        
        // 2. Launch PayChangu inline payment popup
        const paychanguConfig = {
          public_key: regResult.public_key,
          tx_ref: regResult.tx_ref, // ensure this is unique per payment (already handled)
          amount: regResult.amount,
          currency: 'MWK',
          callback_url: 'https://car-quizz.onrender.com/paychangu-callback',
          return_url: window.location.origin + '/login?payment=success', // Redirect to login page after payment
          customer: {
            email: regResult.email,
            first_name: username,
            last_name: ''
          },
          customization: {
            title: 'Quiz Registration Payment',
            description: 'Registration fee for quiz platform'
          },
          meta: {
            uuid: regResult.tx_ref,
            response: 'Response' // docs example includes this
          }
        };
        console.log('PayChangu config:', paychanguConfig);
        if (!paychanguConfig.public_key || !paychanguConfig.tx_ref || !paychanguConfig.amount || !paychanguConfig.customer.email) {
          setError('Payment initiation failed. Please contact support.');
          setLoading(false);
          return;
        }
        waitForPayChanguAndLaunch(paychanguConfig, setError, setLoading);
        // 3. Show user a message to complete payment in popup
        setError('Please complete payment in the popup. After payment, your registration will be finalized.');
        setLoading(false);
        return;
      } catch (err: any) {
        console.error('Registration error:', err);
        setError(err.message || 'Registration failed');
        setLoading(false);
      }
      return;
    }

    // Login flow
    try {
      const response = await api.post<{ user: any; token: string; refreshToken: string }>('/auth/login', { email, password });
      const { user, token, refreshToken } = response.data;
      
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
          <>
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              disabled={loading}
            />
            <input
              type="tel"
              placeholder="Phone Number"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              required
              disabled={loading}
            />
            <input
              type="number"
              placeholder="Amount (MWK)"
              value={amount}
              onChange={e => setAmount(Number(e.target.value))}
              required
              disabled={loading}
            />
          </>
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

