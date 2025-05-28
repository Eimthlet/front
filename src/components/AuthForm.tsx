import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { jwtDecode } from 'jwt-decode';
import { API_CONFIG, AUTH_CONFIG, PAYMENT_CONFIG } from '../config';
import { Checkbox, FormControlLabel, Link, IconButton } from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import './AuthForm.css';

// Helper function to generate UUID using Web Crypto API instead of Node.js crypto
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

interface AuthFormProps {
  mode: 'login' | 'register';
}

interface JwtPayload {
  id: number;
  email: string;
  isAdmin?: boolean;
  exp?: number;
}

interface PayChanguConfig {
  public_key: string;
  tx_ref: string;
  amount: number;
  currency: string;
  callback_url: string;
  return_url: string;
  customer: {
    email: string;
    first_name: string;
    last_name: string;
  };
  customization: {
    title: string;
    description: string;
    logo?: string;
  };
  meta: {
    uuid: string;
    response: string;
  };
}

interface ApiError {
  response?: {
    status: number;
    statusText: string;
    data: {
      error?: string;
      message?: string;
    };
    headers?: Record<string, string>;
  };
  message: string;
  name: string;
  stack?: string;
}

interface User {
  id: number;
  username: string;
  role: string;
}

interface LoginResponse {
  user: User;
  token: string;
  refreshToken: string;
}

interface PendingRegistrationResponse {
  success: boolean;
  pending: boolean;
  tx_ref?: string;
  email?: string;
}

interface ResumePaymentResponse {
  success: boolean;
  tx_ref: string;
  public_key: string;
  amount: number;
  email: string;
  phone: string;
  message: string;
}

const AuthForm: React.FC<AuthFormProps> = ({ mode }) => {
  // Wait for PayChangu script to load before calling the popup
  function waitForPayChanguAndLaunch(config: PayChanguConfig, setError: (msg: string) => void, setLoading: (loading: boolean) => void, retries = 10) {
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
  const [currentMode, setCurrentMode] = useState<'login' | 'register'>(mode);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const navigate = useNavigate();
  const { login: authLogin, isAdmin, error: authError, clearError } = useAuth();

  const [hasPendingRegistration, setHasPendingRegistration] = useState(false);
  const [pendingTxRef, setPendingTxRef] = useState('');

  // Function to check for pending registration and resume payment
  const checkPendingRegistration = async (emailToCheck: string) => {
    try {
      setLoading(true);
      const response = await api.post<PendingRegistrationResponse>('/api/auth/check-pending-registration', { email: emailToCheck });
      if (response.data.pending && response.data.tx_ref) {
        setPendingTxRef(response.data.tx_ref);
        setHasPendingRegistration(true);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error checking pending registration:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Function to resume payment with existing tx_ref
  const resumePayment = async () => {
    try {
      setLoading(true);
      const response = await api.post<ResumePaymentResponse>('/api/auth/resume-payment', { 
        tx_ref: pendingTxRef,
        email: email
      });
      
      if (response.data.public_key && response.data.tx_ref) {
        const config: PayChanguConfig = {
          public_key: response.data.public_key,
          tx_ref: response.data.tx_ref,
          amount: response.data.amount || amount,
          currency: PAYMENT_CONFIG.CURRENCY,
          callback_url: PAYMENT_CONFIG.CALLBACK_URL,
          return_url: PAYMENT_CONFIG.RETURN_URL,
          customer: {
            email: email,
            first_name: username || email.split('@')[0],
            last_name: ''
          },
          customization: {
            title: 'Car Quiz Registration',
            description: 'Complete your registration payment',
            logo: undefined
          },
          meta: {
            uuid: generateUUID(),
            response: 'success'
          }
        };
        
        waitForPayChanguAndLaunch(config, setError, setLoading);
      } else {
        setError('Could not retrieve payment information');
        setLoading(false);
      }
    } catch (error) {
      console.error('Error resuming payment:', error);
      setError('Failed to resume payment. Please try again.');
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Email validation
    if (!email) {
      setError('Email is required');
      setLoading(false);
      return;
    }
    
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }
    
    // Password validation
    if (!password) {
      setError('Password is required');
      setLoading(false);
      return;
    }
    
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      setLoading(false);
      return;
    }

    if (currentMode === 'register') {
      // Phone validation
      if (!phone.trim()) {
        setError('Phone number is required');
        setLoading(false);
        return;
      }
      
      const phoneRegex = /^\+?[0-9]{10,15}$/;
      if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
        setError('Please enter a valid phone number (10-15 digits)');
        setLoading(false);
        return;
      }
      
      // Amount validation
      if (!amount || amount <= 0) {
        setError('Amount is required and must be positive');
        setLoading(false);
        return;
      }
      
      // Terms validation
      if (!acceptedTerms) {
        setError('Please accept the Terms and Conditions');
        setLoading(false);
        return;
      }

      // Password confirmation validation
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        setLoading(false);
        return;
      }

      // Username validation
      if (!username.trim()) {
        setError('Username is required');
        setLoading(false);
        return;
      }
      
      if (username.length < 3 || username.length > 20) {
        setError('Username must be between 3 and 20 characters');
        setLoading(false);
        return;
      }
      
      const usernameRegex = /^[a-zA-Z0-9_-]+$/;
      if (!usernameRegex.test(username)) {
        setError('Username can only contain letters, numbers, underscores and hyphens');
        setLoading(false);
        return;
      }

      try {
        // 1. Send registration info to backend and get tx_ref, public_key, etc.
        const endpoint = '/api/auth/register';
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
          tx_ref: regResult.tx_ref,
          amount: regResult.amount,
          currency: PAYMENT_CONFIG.CURRENCY,
          callback_url: PAYMENT_CONFIG.CALLBACK_URL,
          return_url: PAYMENT_CONFIG.RETURN_URL,
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
            uuid: generateUUID(),
            response: 'Response'
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
        
        // Get the specific error message from the API response
        const apiError = err.response?.data?.message || err.response?.data?.error || err.message;
        
        // Check if this is a pending registration error
        if (apiError && (apiError.includes('pending registration') || apiError.includes('pending for this email'))) {
          // Check for pending registration and resume payment if found
          const hasPending = await checkPendingRegistration(email);
          if (hasPending) {
            await resumePayment();
            return;
          }
        }
        
        // Display the exact API error message if it exists
        if (apiError) {
          setError(apiError);
        } else {
          setError('Unable to complete registration. Please try again.');
        }
        
        setLoading(false);
      }
      return;
    }

    // Login flow
    try {
      // Clear any previous errors from the context
      clearError();
      
      // Use the authLogin function from AuthContext which handles cookies properly
      await authLogin(email, password);
      
      // After successful login, navigate to the appropriate page based on user role
      // The isAdmin state will be updated by the authLogin function
      setTimeout(() => {
        navigate(isAdmin ? '/admin' : '/quiz', { replace: true });
      }, 500); // Small delay to ensure state is updated
    } catch (err: any) {
      console.error('Authentication error:', err);
      
      // Get the specific error message from the API response
      const apiError = err.response?.data?.message || err.response?.data?.error || err.message;
      
      // Display the exact API error message if it exists
      if (apiError) {
        setError(apiError);
      } else {
        setError('Unable to log in. Please check your credentials and try again.');
      }
      
      setLoading(false);
      return;
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
        {(error || authError) && !hasPendingRegistration && (
          <div className="auth-error">
            <p>{error || authError}</p>
            {error && error.includes('already pending for this email') && (
              <button 
                type="button" 
                onClick={() => checkPendingRegistration(email)}
                disabled={loading}
                className="check-pending-btn"
              >
                {loading ? 'Checking...' : 'Check Pending Registration'}
              </button>
            )}
          </div>
        )}
        
        {hasPendingRegistration && (
          <div className="pending-registration">
            <p>You have a pending registration that requires payment completion.</p>
            <button 
              type="button" 
              onClick={resumePayment}
              disabled={loading}
              className="resume-payment-btn"
            >
              {loading ? 'Processing...' : 'Complete Payment'}
            </button>
          </div>
        )}
      </form>
    </div>
  );
};

export default AuthForm;

