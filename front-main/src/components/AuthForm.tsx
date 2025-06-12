import React, { useState, useEffect, FC, ReactElement } from 'react';
import { 
  Checkbox, 
  FormControlLabel, 
  Link, 
  IconButton, 
  Box
} from '@mui/material';
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

interface ResumePaymentData {
  tx_ref: string;
  public_key: string;
  amount: number;
  email: string;
  phone?: string;
}

interface ResumePaymentResponse {
  success: boolean;
  data?: ResumePaymentData;
  message?: string;
  tx_ref?: string;
  public_key?: string;
  amount?: number;
  email?: string;
  phone?: string;
}

interface ApiResponse<T> {
  data: T;
  success: boolean;
  status?: number;
  message?: string;
  error?: string;
}

interface RegistrationResponseData {
  tx_ref: string;
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

const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const AuthForm: FC<{ mode: 'login' | 'register' }> = ({ mode }): ReactElement => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    amount: 1000,
  });
  
  const [uiState, setUiState] = useState({
    showPassword: false,
    showConfirmPassword: false,
    acceptedTerms: false,
    loading: false,
    currentMode: mode as 'login' | 'register',
  });
  
  const [error, setError] = useState<string>('');
  const auth = useAuth();
  const { login, error: authError, clearError } = auth || {};
  
  const { username, email, password, confirmPassword, phone, amount } = formData;
  const { showPassword, showConfirmPassword, acceptedTerms, loading, currentMode } = uiState;
  

  const setUsername = (value: string) => {
    setFormData(prev => ({ ...prev, username: value }));
  };
  
  const setEmail = (value: string) => {
    setFormData(prev => ({ ...prev, email: value }));
  };
  
  const setPassword = (value: string) => {
    setFormData(prev => ({ ...prev, password: value }));
  };
  
  const setConfirmPassword = (value: string) => {
    setFormData(prev => ({ ...prev, confirmPassword: value }));
  };
  
  const setPhone = (value: string) => {
    setFormData(prev => ({ ...prev, phone: value }));
  };
  
  const setAmount = (value: number) => {
    setFormData(prev => ({ ...prev, amount: value }));
  };
  
  const setAcceptedTerms = (value: boolean) => {
    setUiState(prev => ({ ...prev, acceptedTerms: value }));
  };
  
  const setCurrentMode = (value: 'login' | 'register') => {
    setUiState(prev => ({ ...prev, currentMode: value }));
  };

  const togglePasswordVisibility = (field: 'password' | 'confirmPassword') => {
    setUiState(prev => ({
      ...prev,
      [field === 'password' ? 'showPassword' : 'showConfirmPassword']: 
        !prev[field === 'password' ? 'showPassword' : 'showConfirmPassword']
    }));
  };

  // Response from /auth/check-pending-registration
  interface CheckPendingResponseData {
    success: boolean;
    pending: boolean;
    tx_ref?: string;
    email?: string;
    error?: string;
  }
  
  // The full axios response structure
  interface AxiosResponse<T> {
    data: T;
    status: number;
    statusText: string;
    headers: any;
    config: any;
  }

  const checkPendingRegistration = async (email: string): Promise<{ pending: boolean; tx_ref?: string; email?: string }> => {
    console.log('Checking pending registration for:', email);
    try {
      const response = await apiClient.request<CheckPendingResponseData>({
        method: 'POST',
        url: '/auth/check-pending-registration',
        data: { email },
        timeout: 10000, // 10 seconds timeout
        validateStatus: (status) => status < 500 // Don't throw on 4xx errors
      });
      
      console.log('Check pending registration response status:', response.status);
      console.log('Response data:', response.data);
      
      const responseData = response.data;
      
      // If there's an error in the response, log it but continue
      if (!responseData.success) {
        console.warn('Backend warning:', responseData.error || 'Unknown error checking pending registration');
        return { pending: false };
      }
      
      // Return the pending status and transaction reference if pending
      return {
        pending: responseData.pending,
        tx_ref: responseData.tx_ref,
        email: responseData.email
      };
    } catch (error) {
      console.error('Error checking pending registration:', error);
      // Return default values that indicate no pending registration
      return { 
        pending: false, 
        tx_ref: undefined,
        email: undefined
      };
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
    setUiState(prev => ({ ...prev, loading: true }));
    setError('');
    if (clearError) clearError();

    try {
      if (currentMode === 'register') {
        // Registration flow
        // Validate form inputs
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          setUiState(prev => ({ ...prev, loading: false }));
          return;
        }

        if (!acceptedTerms) {
          setError('You must accept the terms and conditions');
          setUiState(prev => ({ ...prev, loading: false }));
          return;
        }

        // Check for pending registration
        const { pending, tx_ref } = await checkPendingRegistration(email);
        
        if (pending && tx_ref) {
          // Attempt to resume payment for pending registration
          try {
            const { data, status, statusText, headers } = await apiClient.request<ApiResponse<ResumePaymentResponse>>({
              method: 'POST',
              url: '/auth/resume-payment',
              data: { 
                email: email,
                tx_ref,
                original_tx_ref: tx_ref
              },
              validateStatus: (status) => status < 500 // Don't throw for 4xx errors
            });

            console.log('Resume payment response:', {
              status,
              statusText,
              data,
              headers
            });

            if (data?.success && data.data) {
              // Launch payment popup with the resumed payment details
              const paymentData = data.data;
              const config: PayChanguConfig = {
                public_key: paymentData.public_key || PAYMENT_CONFIG.PUBLIC_KEY,
                tx_ref: paymentData.tx_ref || '',
                amount: paymentData.amount || amount,
                currency: PAYMENT_CONFIG.CURRENCY,
                callback_url: `${window.location.origin}${PAYMENT_CONFIG.CALLBACK_URL}`,
                return_url: `${window.location.origin}${PAYMENT_CONFIG.RETURN_URL}`,
                customer: {
                  email: paymentData.email || email,
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

              waitForPayChanguAndLaunch(config, setError, (loading) => 
                setUiState(prev => ({ ...prev, loading }))
              );
              return;
            }
          } catch (error) {
            console.error('Error resuming payment:', error);
            setError('Failed to resume payment. Please try registering again.');
            setUiState(prev => ({ ...prev, loading: false }));
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

        // Backend will handle validation, but we'll do basic client-side validation
        if (!payload.phone) {
          throw new Error('Phone number is required');
        }
        
        if (isNaN(payload.amount) || payload.amount <= 0) {
          throw new Error('Amount must be a positive number');
        }

        console.log('Registration payload:', JSON.stringify(payload, null, 2));

        try {
          console.log('Sending registration request to:', '/auth/register');
          console.log('Request payload:', JSON.stringify(payload, null, 2));
          
          const { data, status, statusText, headers } = await apiClient.request<ApiResponse<RegistrationResponseData>>({
            method: 'POST',
            url: '/auth/register',
            data: payload,
            validateStatus: (status) => status < 500, // Don't throw for 4xx errors
            timeout: 15000,
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            }
          });

          console.log('Registration response status:', status);
          if (headers) {
            console.log('Registration response headers:', headers);
          }
          console.log('Registration response data:', data);

          if (!data) {
            console.error('No response data received from server');
            throw new Error('No response data received from server');
          }

          // Handle error responses - check response status and success flag
          if (status >= 400) {
            // For error responses, data might not follow ApiResponse structure
            const responseData = data as any;
            console.error('Registration error response:', {
              status,
              statusText,
              data: responseData,
              headers
            });
            
            // Try to extract error message from backend response format
            let errorMessage = 'Registration failed';
            
            if (responseData) {
              // Handle different backend error formats
              if (typeof responseData === 'string') {
                errorMessage = responseData;
              } else if (responseData.error) {
                errorMessage = typeof responseData.error === 'string' 
                  ? responseData.error 
                  : responseData.error.message || 'Unknown error';
              } else if (responseData.message) {
                errorMessage = responseData.message;
              }
            }
            
            // Add status code if available
            if (status) {
              errorMessage += ` (Status: ${status})`;
            }
            
            throw new Error(errorMessage);
          }

          // responseData is already destructured as 'data'
          const responseData = data;
          
          // Check if the response has the expected structure
          if (!responseData || typeof responseData !== 'object') {
            throw new Error('Invalid response format from server');
          }
          
          // Check if this is an error response
          if ('error' in responseData || !('success' in responseData) || !responseData.success) {
            const errorMessage = (responseData as any).message || 
                              (responseData as any).error || 
                              'Registration failed';
            throw new Error(errorMessage);
          }

          // Get the transaction reference from the response data
          const tx_ref = (responseData as any).tx_ref || (responseData as any).data?.tx_ref;

          // Log the full response for debugging
          console.log('Transaction reference:', tx_ref);

          // Launch payment popup if we have a transaction reference
          if (!tx_ref) {
            throw new Error('No transaction reference received from server');
          }

          const config: PayChanguConfig = {
            public_key: PAYMENT_CONFIG.PUBLIC_KEY,
            tx_ref: tx_ref,
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

          waitForPayChanguAndLaunch(config, setError, (loading) => 
            setUiState(prev => ({ ...prev, loading }))
          );
        } catch (error: any) {
          console.error('Registration error:', error);
          console.error('Full error object:', error);
          const errorMessage = 
            (error as any)?.response?.data?.error || 
            (error as any)?.response?.data?.message || 
            (typeof (error as any)?.response?.data === 'string' ? (error as any).response.data : null) ||
            error.message || 
            'An error occurred during registration. Please try again.';
          setError(errorMessage);
          setUiState(prev => ({ ...prev, loading: false }));
        }
      } else {
        // Login flow
        try {
          await login(email, password);
          // After successful login, navigation is handled by App.tsx based on `user` state change
        } catch (error) {
          console.error('Login error:', error);
          // Error is already set by the login function in AuthContext
        } finally {
          setUiState(prev => ({ ...prev, loading: false }));
        }
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      setError('An unexpected error occurred. Please try again.');
      setUiState(prev => ({ ...prev, loading: false }));
    }
  };

  // Render the form
  return (
    <Box className="auth-form-container" sx={{ maxWidth: 400, mx: 'auto', p: 3 }}>
      <Box 
        component="form" 
        className="auth-form" 
        onSubmit={handleSubmit} 
        sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
      >
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
            onClick={() => togglePasswordVisibility('password')}
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
                onClick={() => togglePasswordVisibility('confirmPassword')}
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