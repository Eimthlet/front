import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Paper, Alert, CircularProgress, Divider } from '@mui/material';
import { checkAdminStatus, fixAdminToken } from '../utils/checkAdmin';
import apiClient from '../utils/apiClient';

const AdminDiagnostic: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [adminStatus, setAdminStatus] = useState<any>(null);
  const [fixResult, setFixResult] = useState<any>(null);
  const [apiTest, setApiTest] = useState<any>(null);
  const [tokenDetails, setTokenDetails] = useState<any>(null);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    setLoading(true);
    try {
      const result = await checkAdminStatus();
      setAdminStatus(result);
      
      // Check token details
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const parseJwt = (token: string) => {
            try {
              return JSON.parse(atob(token.split('.')[1]));
            } catch (e) {
              return null;
            }
          };
          
          const decoded = parseJwt(token);
          setTokenDetails({
            decoded,
            expiryDate: decoded?.exp ? new Date(decoded.exp * 1000).toLocaleString() : 'Unknown',
            issuedAt: decoded?.iat ? new Date(decoded.iat * 1000).toLocaleString() : 'Unknown'
          });
        } catch (e) {
          setTokenDetails({ error: 'Failed to decode token' });
        }
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      setAdminStatus({ success: false, message: 'Error checking status', error });
    } finally {
      setLoading(false);
    }
  };

  const fixAdminIssue = async () => {
    setLoading(true);
    try {
      const result = await fixAdminToken();
      setFixResult(result);
      
      // Refresh admin status after fix attempt
      await checkStatus();
    } catch (error) {
      console.error('Error fixing admin token:', error);
      setFixResult({ success: false, message: 'Error during fix attempt', error });
    } finally {
      setLoading(false);
    }
  };

  const testAdminEndpoint = async () => {
    setLoading(true);
    try {
      // Test a simple admin endpoint
      const result = await apiClient.get('/admin/users');
      setApiTest({
        success: true,
        message: 'Successfully connected to admin endpoint',
        data: result
      });
    } catch (error) {
      console.error('Error testing admin endpoint:', error);
      setApiTest({
        success: false,
        message: 'Failed to connect to admin endpoint',
        error
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        Admin Diagnostic Tool
      </Typography>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Admin Status Check
        </Typography>
        
        {loading && <CircularProgress size={24} sx={{ mb: 2 }} />}
        
        {adminStatus && (
          <Alert 
            severity={adminStatus.success ? "success" : "error"}
            sx={{ mb: 2 }}
          >
            {adminStatus.message}
          </Alert>
        )}
        
        <Button 
          variant="contained" 
          onClick={checkStatus}
          disabled={loading}
          sx={{ mr: 2 }}
        >
          Check Admin Status
        </Button>
        
        <Button 
          variant="contained" 
          color="secondary"
          onClick={fixAdminIssue}
          disabled={loading}
        >
          Fix Admin Access
        </Button>
      </Paper>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Token Details
        </Typography>
        
        {tokenDetails ? (
          <Box component="pre" sx={{ 
            p: 2, 
            bgcolor: 'background.paper', 
            border: '1px solid #ddd',
            borderRadius: 1,
            overflow: 'auto',
            fontSize: '0.875rem'
          }}>
            {JSON.stringify(tokenDetails, null, 2)}
          </Box>
        ) : (
          <Alert severity="info">No token details available</Alert>
        )}
      </Paper>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Test Admin API
        </Typography>
        
        {apiTest && (
          <Alert 
            severity={apiTest.success ? "success" : "error"}
            sx={{ mb: 2 }}
          >
            {apiTest.message}
          </Alert>
        )}
        
        <Button 
          variant="contained" 
          color="primary"
          onClick={testAdminEndpoint}
          disabled={loading}
        >
          Test Admin Endpoint
        </Button>
        
        {apiTest && apiTest.data && (
          <Box sx={{ mt: 2 }}>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2">API Response:</Typography>
            <Box component="pre" sx={{ 
              p: 2, 
              bgcolor: 'background.paper', 
              border: '1px solid #ddd',
              borderRadius: 1,
              overflow: 'auto',
              fontSize: '0.875rem',
              maxHeight: 200
            }}>
              {JSON.stringify(apiTest.data, null, 2)}
            </Box>
          </Box>
        )}
      </Paper>
      
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Fix Instructions
        </Typography>
        
        <Typography paragraph>
          If the diagnostic shows you're not an admin or can't access admin endpoints:
        </Typography>
        
        <ol>
          <li>
            <Typography paragraph>
              Click the "Fix Admin Access" button to attempt an automatic fix.
            </Typography>
          </li>
          <li>
            <Typography paragraph>
              If that doesn't work, try logging out and logging back in with your admin credentials:
              <br />
              Email: carguru@gmail.com
              <br />
              Password: Cars@2025
            </Typography>
          </li>
          <li>
            <Typography paragraph>
              After logging in, return to this page and check your admin status again.
            </Typography>
          </li>
        </ol>
      </Paper>
    </Box>
  );
};

export default AdminDiagnostic;
