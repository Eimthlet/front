import React from 'react';
import { Box, styled } from '@mui/material';

const GlassContainer = styled(Box)(({ theme }) => ({
  background: 'rgba(18, 18, 18, 0.8)',
  backdropFilter: 'blur(10px)',
  borderRadius: theme.spacing(3),
  padding: theme.spacing(3),
  color: '#fff',
  boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  width: '100%',
  maxWidth: '100%',
  margin: '0 auto',
  [theme.breakpoints.up('sm')]: {
    padding: theme.spacing(4),
  },
  [theme.breakpoints.up('md')]: {
    maxWidth: '800px',
  }
}));

const PageContainer = styled(Box)(({ theme }) => ({
  minHeight: '100vh',
  background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
  padding: '80px 16px 24px 16px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  [theme.breakpoints.up('sm')]: {
    padding: '90px 24px 32px 24px',
  },
  [theme.breakpoints.up('md')]: {
    padding: '100px 32px 40px 32px',
  }
}));

interface LayoutProps {
  children: React.ReactNode;
  fullWidth?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, fullWidth = false }) => {
  return (
    <PageContainer>
      <GlassContainer sx={fullWidth ? { maxWidth: 'none' } : undefined}>
        {children}
      </GlassContainer>
    </PageContainer>
  );
};

export default Layout; 