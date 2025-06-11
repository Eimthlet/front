import React, { useState, useEffect, FC, ReactElement } from 'react';
import { Checkbox, FormControlLabel, Link, IconButton, TextField, Button, Typography, Box } from '@mui/material';
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

// Generate UUID for payment reference
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const AuthForm: FC<{ mode: 'login' | 'register' }> = ({ mode }): ReactElement => {
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

  const { login, error: authError, clearError } = useAuth();

  // Check if there's a pending registration for the given email
  const checkPendingRegistration = async (email: string): Promise<{ pending: boolean; tx_ref?: string }> => {
    console.log('Checking pending registration for:', email);
    try {
      const response = await apiClient.post<any>(
        '/auth/check-pending-registration', 
        { email },
        { 
          timeout: 10000, // Increased timeout to 10 seconds
          validateStatus: (status) => status < 500, // Don't throw on 4xx errors
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('Check pending registration response status:', response.status);
      console.log('Response data:', response.data);
      
      // Handle different response formats
      if (response.data?.data) {
        return {
          pending: Boolean(response.data.data.pending),
          tx_ref: response.data.data.tx_ref
        };
      } else if (response.data?.pending !== undefined) {
        // Handle direct response format
        return {
          pending: Boolean(response.data.pending),
          tx_ref: response.data.tx_ref
        };
      } else if (response.data) {
        // If we have data but not in expected format, log it
        console.warn('Unexpected response format:', response.data);
      }
      
      return {
        pending: response.data?.data?.pending || false,
        tx_ref: response.data?.data?.tx_ref
      };
    } catch (error) {
      console.error('Error checking pending registration:', error);
      // Continue with registration if we can't check pending status
      return { pending: false };
    }
  };

  // Wait for PayChangu script to load before calling the popup
  const waitForPayChanguAndLaunch = (config: PayChanguConfig, errorSetter: (msg: string) => void, loadingSetter: (loading: boolean) => void, retries = 10): void => {
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

    try {
      if (currentMode === 'register') {
        // Registration flow
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
        const payload = {
          username: username.trim(),
          email: email.trim().toLowerCase(),
          password: password.trim(),
          phone: phone?.trim(),
          amount: Number(amount) // Ensure amount is a number
        };

        // Validate required fields
        const requiredFields = ['username', 'email', 'password', 'amount'];
        const missingFields = requiredFields.filter(field => !payload[field as keyof typeof payload]);
        
        if (missingFields.length > 0) {
          throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
        }

        console.log('Registration payload:', JSON.stringify(payload, null, 2));

        try {
          const response = await apiClient.post<any>(
            '/auth/register', 
            payload,
            { 
              validateStatus: (status) => status < 500, // Don't throw on 4xx errors
              timeout: 15000,
              headers: {
                'Content-Type': 'application/json'
              }
            }
          );

          console.log('Registration response status:', response.status);
          console.log('Registration response data:', response.data);

          if (!response.data) {
            throw new Error('No response data received from server');
          }

          // Normalize response format
          const responseData = response.data.data || response.data;

          // Log the full response for debugging
          console.log('Normalized response data:', responseData);

          if (response.data.success) {
            // Launch payment popup
            if (!responseData.tx_ref) {
              throw new Error('No transaction reference received from server');
            }

            const config: PayChanguConfig = {
              public_key: PAYMENT_CONFIG.PUBLIC_KEY,
              tx_ref: responseData.tx_ref,
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
            const errorMessage = responseData.error || responseData.message || 
              (response.data?.error || response.data?.message) || 
              'Registration failed. Please try again.';
            setError(errorMessage);
            setLoading(false);
          }
        } catch (error: any) {
          console.error('Registration error:', error);
          console.error('Full error object:', error);
          const errorMessage = 
            error.response?.data?.error || 
            error.response?.data?.message || 
            (typeof error.response?.data === 'string' ? error.response.data : null) ||
            error.message || 
            'An error occurred during registration. Please try again.';
          setError(errorMessage);
          setLoading(false);
        }
      } else {
        // Login flow
        // Clear any previous errors from the context
        clearError();

        // Use the login function from AuthContext which handles cookies properly
        await login(email, password);

        // After successful login, navigation is handled by App.tsx based on `user` state change
        // from AuthContext. The navigation here is redundant and might conflict.
        // navigate('/dashboard');
      }
    } catch (error) {
      console.error('Login error:', error);
      // Error is already set by the login function in AuthContext
    } finally {
      setLoading(false);
    }
  };

  // Render the form
  return (
    <Box className="auth-form-container" sx={{ maxWidth: 400, mx: 'auto', p: 3 }}>
      <Box component="form" className="auth-form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
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
      </Box>
    </Box>
  );
};

export default AuthForm;