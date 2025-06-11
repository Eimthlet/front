import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Checkbox, FormControlLabel, Link, IconButton } from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import apiClient from '../utils/apiClient';
import { useAuth } from '../contexts/AuthContext';
import './AuthForm.css';

// Payment configuration
const PAYMENT_CONFIG = {
  CALLBACK_URL: '/payment-callback',
  RETURN_URL: '/payment-success',
  CURRENCY: 'MWK',
  PUBLIC_KEY: process.env.REACT_APP_PAYCHANGU_PUBLIC_KEY || ''
} as const;

// No global declaration needed - handled elsewhere or will be typed as any

interface PendingRegistrationResponse {
  data: {
    success: boolean;
    pending: boolean;
    tx_ref?: string;
    email?: string;
    username?: string;
    error?: string;
    message?: string;
  };
}

interface ResumePaymentResponse {
  success: boolean;
  tx_ref: string;
  public_key: string;
  amount: number;
  email: string;
  phone?: string;
  message?: string;
}

interface ApiResponse<T> {
  data: T;
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

const AuthForm: React.FC<{ mode: 'login' | 'register' }> = ({ mode }) => {
  // State for form fields
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState<number>(1000);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [currentMode, setCurrentMode] = useState<'login' | 'register'>(mode);
  const [error, setError] = useState<string | React.ReactElement>('');
  const [loading, setLoading] = useState(false);

  const { login, register: authRegister, error: authError, clearError } = useAuth();
  const navigate = useNavigate();

  // Check if there's a pending registration for the given email
  const checkPendingRegistration = async (email: string): Promise<{ pending: boolean; tx_ref?: string }> => {
    try {
      const response = await apiClient.post<ApiResponse<PendingRegistrationResponse>>('/auth/check-pending-registration', { email });
      return {
        pending: response.data.data.pending || false,
        tx_ref: response.data.data.tx_ref
      };
    } catch (error) {
      console.error('Error checking pending registration:', error);
      return { pending: false };
    }
  };

  // Wait for PayChangu script to load before calling the popup
  const waitForPayChanguAndLaunch = (config: PayChanguConfig, errorSetter: (msg: string) => void, loadingSetter: (loading: boolean) => void, retries = 10) => {
    const paychangu = (window as any).PaychanguCheckout;
    if (paychangu) {
      paychangu(config);
    } else if (retries > 0) {
      setTimeout(() => waitForPayChanguAndLaunch(config, errorSetter, loadingSetter, retries - 1), 300);
    } else {
      errorSetter('Payment system failed to load. Please refresh and try again.');
      loadingSetter(false);
    }
  };

  // Load PayChangu popup script if not already loaded
  useEffect(() => {
    if (!(window as any).PaychanguCheckout) {
      const script = document.createElement('script');
      script.src = 'https://in.paychangu.com/js/popup.js';
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.onerror = () => {
        console.error('Failed to load PayChangu script');
        setError('Payment system failed to load. Please refresh and try again.');
      };
      document.body.appendChild(script);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (currentMode === 'register') {
      // Registration flow
      try {
        // Clear any previous errors
        setError('');
        clearError();

        // Validate form inputs
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          setLoading(false);
          return;
        }

        if (!acceptedTerms) {
          setError('You must accept the terms and conditions');
          setLoading(false);
          return;
        }

        // Check for pending registration
        const { pending, tx_ref } = await checkPendingRegistration(email);
        
        if (pending && tx_ref) {
          // Attempt to resume payment for pending registration
          try {
            const response = await apiClient.post<ApiResponse<ResumePaymentResponse>>('/auth/resume-payment', { 
              email,
              tx_ref 
            });

            if (response.data.success) {
              // Launch payment popup with the resumed payment details
              const paymentData = response.data;
              const config: PayChanguConfig = {
                public_key: paymentData.public_key,
                tx_ref: paymentData.tx_ref,
                amount: paymentData.amount,
                currency: PAYMENT_CONFIG.CURRENCY,
                callback_url: `${window.location.origin}${PAYMENT_CONFIG.CALLBACK_URL}`,
                return_url: `${window.location.origin}${PAYMENT_CONFIG.RETURN_URL}`,
                customer: {
                  email: paymentData.email,
                  first_name: username.split(' ')[0] || 'User',
                  last_name: username.split(' ')[1] || 'Name',
                },
                customization: {
                  title: 'Quiz Registration',
                  description: 'Complete your registration by making the payment',
                },
                meta: {
                  uuid: generateUUID(),
                  response: 'json'
                }
              };

              waitForPayChanguAndLaunch(config, setError, setLoading);
              return;
            }
          } catch (error) {
            console.error('Error resuming payment:', error);
            setError('Failed to resume payment. Please try registering again.');
            setLoading(false);
            return;
          }
        }

        // If no pending registration, proceed with new registration
        const response = await apiClient.post<ApiResponse<{ 
          success: boolean; 
          tx_ref: string; 
          message?: string 
        }>>('/auth/register', {
          username,
          email,
          password,
          phone,
          amount
        });

        if (response.data.success) {
          // Launch payment popup
          const config: PayChanguConfig = {
            public_key: PAYMENT_CONFIG.PUBLIC_KEY,
            tx_ref: response.data.tx_ref,
            amount: amount,
            currency: PAYMENT_CONFIG.CURRENCY,
            callback_url: `${window.location.origin}${PAYMENT_CONFIG.CALLBACK_URL}`,
            return_url: `${window.location.origin}${PAYMENT_CONFIG.RETURN_URL}`,
            customer: {
              email: email,
              first_name: username.split(' ')[0] || 'User',
              last_name: username.split(' ')[1] || 'Name',
            },
            customization: {
              title: 'Quiz Registration',
              description: 'Complete your registration by making the payment',
            },
            meta: {
              uuid: generateUUID(),
              response: 'json'
            }
          };

          waitForPayChanguAndLaunch(config, setError, setLoading);
        } else {
          setError(response.data.message || 'Registration failed. Please try again.');
          setLoading(false);
        }
      } catch (error) {
        console.error('Registration error:', error);
        setError('An error occurred during registration. Please try again.');
        setLoading(false);
      }
    } else {
      // Login flow
      try {
        // Clear any previous errors from the context
        clearError();

        // Use the login function from AuthContext which handles cookies properly
        await login(email, password);

        // After successful login, navigation is handled by App.tsx based on `user` state change
        // from AuthContext. The navigation here is redundant and might conflict.
        // navigate('/dashboard');
      } catch (error) {
        console.error('Login error:', error);
        // Error is already set by the login function in AuthContext
      } finally {
        setLoading(false);
      }
    }
  };

  // Generate UUID for payment reference
  const generateUUID = (): string => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.floor(Math.random() * 16);
      const v = c === 'x' ? r : ((r & 0x3) | 0x8);
      return v.toString(16);
    });
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
              autoComplete="username"
            />
            <input
              type="tel"
              placeholder="Phone"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              required
              disabled={loading}
              autoComplete="tel"
            />
            <input
              type="number"
              placeholder="Amount (MWK)"
              value={amount}
              onChange={e => setAmount(Number(e.target.value))}
              required
              disabled={loading}
              autoComplete="off"
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
          autoComplete="email"
        />
        <div className="password-input">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            disabled={loading}
            autoComplete={currentMode === 'login' ? "current-password" : "new-password"}
          />
          <IconButton
            onClick={() => setShowPassword(!showPassword)}
            edge="end"
            className="password-toggle"
            tabIndex={-1}
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
                autoComplete="new-password"
              />
              <IconButton
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                edge="end"
                className="password-toggle"
                tabIndex={-1}
              >
                {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </div>
            <FormControlLabel
              control={
                <Checkbox
                  checked={acceptedTerms}
                  onChange={e => setAcceptedTerms(e.target.checked)}
                  disabled={loading}
                  sx={{ color: '#43cea2', '&.Mui-checked': { color: '#43cea2' } }}
                />
              }
              label={
                <span style={{ fontSize: '0.9rem' }}>
                  I accept the{' '}
                  <Link
                    href="#"
                    onClick={e => {
                      e.preventDefault();
                      alert('Terms and Conditions: This quiz application is for educational purposes only. By accepting these terms, you agree to use the application responsibly and acknowledge that your quiz results and personal information will be stored securely.');
                    }}
                    sx={{ color: '#43cea2', textDecoration: 'underline', '&:hover': { color: '#185a9d' } }}
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
          {loading ? (currentMode === 'login' ? 'Logging in...' : 'Processing...') : (currentMode === 'login' ? 'Login' : 'Register')}
        </button>
        <div className="switch-mode">
          {currentMode === 'login' ? (
            <span>Don't have an account? <button type="button" onClick={() => { setCurrentMode('register'); setError(''); }}>{'Register'}</button></span>
          ) : (
            <span>Already have an account? <button type="button" onClick={() => { setCurrentMode('login'); setError(''); }}>{'Login'}</button></span>
          )}
        </div>
        {(error || authError) && (
          <div className="auth-error">
            <p>{error || authError}</p>
          </div>
        )}
      </form>
    </div>
  );
};

export default AuthForm;