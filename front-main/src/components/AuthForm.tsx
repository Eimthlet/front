import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../utils/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { PAYMENT_CONFIG } from '../config';
import { Checkbox, FormControlLabel, Link, IconButton } from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import './AuthForm.css';

interface PendingRegistrationResponse {
  pending: boolean;
  tx_ref?: string;
}

interface ResumePaymentResponse {
  success: boolean;
  tx_ref: string;
  public_key: string;
  amount: number;
  email: string;
}

// Helper function to generate UUID using Web Crypto API instead of Node.js crypto
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    const v = c === 'x' ? r : ((r & 0x3) | 0x8);
    return v.toString(16);
  });
};

interface AuthFormProps {
  mode: 'login' | 'register';
}

// JwtPayload interface moved to a separate types file

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

const AuthForm: React.FC<AuthFormProps> = ({ mode }): JSX.Element => {
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
      script.crossOrigin = 'anonymous';
      script.onerror = () => {
        console.error('Failed to load PayChangu script');
        setError('Payment system failed to load. Please refresh and try again.');
      };
      document.body.appendChild(script);
    }
  }, []);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState<number>(1000); // Default amount, adjust as needed
  const [error, setError] = useState<string | React.ReactElement>('');
  const [loading, setLoading] = useState(false);
  const [currentMode, setCurrentMode] = useState<'login' | 'register'>(mode);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const navigate = useNavigate(); // navigate is used in the useEffect, but ESLint might not see it if useEffect is also considered for removal later.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { login: authLogin, register: authRegister, isAdmin, error: authError, clearError, user, isLoading: authIsLoading } = useAuth(); // Added user, authIsLoading for the useEffect

  // Removed unused state variables

  // Check for pending registration
  const checkPendingRegistration = async (emailToCheck: string): Promise<PendingRegistrationResponse | null> => {
    try {
      const response = await apiClient.post('/auth/check-pending-registration', { email: emailToCheck });
      return response?.data || null;
    } catch (error) {
      console.error('Error checking pending registration:', error);
      return null;
    }
  };

  // Resume payment for pending registration
  const resumePayment = async (originalTxRef: string, email: string): Promise<ResumePaymentResponse> => {
    try {
      const response = await apiClient.post('/auth/resume-payment', {
        tx_ref: 'TX' + Date.now() + Math.floor(Math.random() * 1000000),
        original_tx_ref: originalTxRef,
        email
      });
      return response?.data;
    } catch (error) {
      console.error('Error resuming payment:', error);
      throw error;
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

    // Check for pending registration first
    if (currentMode === 'register') {
      const pendingResponse = await checkPendingRegistration(email);
      if (pendingResponse?.pending && pendingResponse.tx_ref) {
        // Automatically resume payment if there's a pending registration
        await resumePayment(pendingResponse.tx_ref, email);
        return;
      }
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
        const payload = { username, email, password, phone, amount };
        console.log('AuthForm: Calling authRegister with payload:', payload);
        const regResult = await authRegister(payload);

        if (!regResult || !regResult.tx_ref || !regResult.public_key) {
          // This case should ideally be handled by authRegister throwing an error,
          // but as a fallback:
          console.error('AuthForm: authRegister did not return expected payment details.', regResult);
          setError(authError || 'Registration initiation failed. Please try again.');
          setLoading(false);
          return;
        }
        
        console.log('AuthForm: authRegister successful, payment details received:', regResult);

        // Launch PayChangu inline payment popup
        const paychanguConfig: PayChanguConfig = {
          public_key: regResult.public_key,
          tx_ref: regResult.tx_ref,
          amount: regResult.amount,
          currency: PAYMENT_CONFIG.CURRENCY, // Make sure PAYMENT_CONFIG is correctly imported and provides CURRENCY
          callback_url: PAYMENT_CONFIG.CALLBACK_URL, // Ensure this is the backend callback URL
          return_url: PAYMENT_CONFIG.RETURN_URL,   // Ensure this is the frontend return URL after backend processing
          customer: {
            email: regResult.email,
            first_name: username, // Or derive from username if needed
            last_name: '' // Or derive from username if needed
          },
          customization: {
            title: 'Quiz Registration Payment',
            description: 'Complete your registration by making the payment.'
            // logo: 'URL_TO_YOUR_LOGO' // Optional: Add your logo URL here
          },
          meta: {
            uuid: generateUUID(), // Ensure generateUUID() is defined and works
            response: 'standard' // As per PayChangu docs, often 'standard' or 'hosted'
          }
        };

        console.log('AuthForm: Constructed PayChangu config:', paychanguConfig);
        
        // Basic validation of constructed config before launching
        if (!paychanguConfig.public_key || !paychanguConfig.tx_ref || !paychanguConfig.amount || !paychanguConfig.customer.email) {
          console.error('AuthForm: Critical payment config data missing before launching PayChangu.', paychanguConfig);
          setError('Payment initiation failed due to missing configuration. Please contact support.');
          setLoading(false);
          return;
        }

        waitForPayChanguAndLaunch(paychanguConfig, setError, setLoading);
        
        setError('Please complete payment in the popup. After payment, your registration will be finalized.');
        // setLoading(false); // setLoading(false) is called in waitForPayChanguAndLaunch on error, or payment popup takes over.
        // No explicit return here, as waitForPayChanguAndLaunch handles the flow.
      } catch (err: any) {
        console.error('Registration error:', err);
        
        // Get the specific error message from the API response
        const apiErrorMessage = err?.response?.data?.message || err?.message || '';
        
        if (apiErrorMessage && (apiErrorMessage.includes('pending registration') || apiErrorMessage.includes('pending for this username') || apiErrorMessage.includes('pending for this email'))) {
          setLoading(true);
          try {
            // First check for pending registration to get the tx_ref
            const pendingResponse = await checkPendingRegistration(email);
            console.log('Pending registration response:', pendingResponse);
            
            if (pendingResponse?.pending && pendingResponse.tx_ref) {
              console.log('Attempting to resume payment with tx_ref:', pendingResponse.tx_ref);
              // Now we have the tx_ref, try to resume payment
              const resumeResponse = await resumePayment(pendingResponse.tx_ref, email);
              console.log('Resume payment response:', resumeResponse);
              
              if (resumeResponse?.success) {
                // Configure and launch payment popup
                const paychanguConfig: PayChanguConfig = {
                  public_key: resumeResponse.public_key,
                  tx_ref: resumeResponse.tx_ref,
                  amount: resumeResponse.amount,
                  currency: PAYMENT_CONFIG.CURRENCY,
                  callback_url: PAYMENT_CONFIG.CALLBACK_URL,
                  return_url: PAYMENT_CONFIG.RETURN_URL,
                  customer: {
                    email: resumeResponse.email,
                    first_name: username,
                    last_name: ''
                  },
                  customization: {
                    title: 'Complete Your Registration Payment',
                    description: 'Please complete your registration by making the payment.'
                  },
                  meta: {
                    uuid: generateUUID(),
                    response: 'standard'
                  }
                };

                console.log('Resuming payment with config:', paychanguConfig);
                waitForPayChanguAndLaunch(paychanguConfig, setError, setLoading);
                setError('Please complete your payment to finalize registration.');
                return;
              } else {
                setError('Failed to process payment. Please try again or contact support.');
              }
            } else {
              setError('A registration is pending but we couldn\'t resume payment. Please contact support.');
              console.error('Pending registration but no tx_ref found:', pendingResponse);
            }
          } catch (error) {
            console.error('Error handling pending registration:', error);
            const errorMessage = (error as any)?.response?.data?.message || 
                             (error as Error)?.message || 
                             'Failed to resume payment. Please try again or contact support.';

            // Create a retry button
            const retryButton = (
              <button 
                onClick={(e) => {
                  e.preventDefault();
                  handleSubmit(e);
                }}
                style={{
                  marginTop: '16px',
                  display: 'block',
                  padding: '8px 16px',
                  backgroundColor: '#1976d2',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Retry Payment
              </button>
            );

            // Set error with retry button
            setError(
              <>
                {errorMessage}
                {retryButton}
              </>
            );
          }
        }
        
        // If we get here, handle other types of errors
        const errorMsg = (err as any)?.response?.data?.message || 
                       (err as Error)?.message || 
                       'Unable to complete registration. Please try again.';
        setError(errorMsg);
        
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
      // Navigation is now primarily handled by App.tsx based on `user` state change from AuthContext.
      // The navigation here is likely redundant and might conflict.
      /*
      setTimeout(() => {
        navigate(isAdmin ? '/admin' : '/quiz', { replace: true });
      }, 500); 
      */
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
              autoComplete="username"
            />
            <input
              type="tel"
              placeholder="Phone Number"
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
            autoComplete="current-password"
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
                autoComplete="new-password"
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
        {(error || authError) && (
          <div className="auth-error">
            <p>{error || authError}</p>
            {typeof error === 'string' && error.includes('already pending for this email') && (
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
      </form>
    </div>
  );
};

export default AuthForm;

