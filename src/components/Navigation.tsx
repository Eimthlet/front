import React, { useState } from 'react';
import { 
  AppBar, 
  Box, 
  Toolbar, 
  Typography, 
  Button, 
  IconButton, 
  Tooltip,
  Menu,
  MenuItem,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import PowerSettingsNewIcon from '@mui/icons-material/PowerSettingsNew';
import LoginIcon from '@mui/icons-material/Login';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import { useAuth } from '../contexts/AuthContext';
import QuizIcon from '@mui/icons-material/Quiz';
import DashboardIcon from '@mui/icons-material/Dashboard';
import LeaderboardIcon from '@mui/icons-material/Leaderboard';
import MenuIcon from '@mui/icons-material/Menu';
import HomeIcon from '@mui/icons-material/Home';
import { styled, Theme } from '@mui/material/styles';

const StyledAppBar = styled(AppBar)(({ theme }: { theme: Theme }) => ({
  background: 'rgba(0, 0, 0, 0.5)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  borderRadius: '0 0 24px 24px',
  width: '100%',
  boxShadow: 'none',
  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
  [theme.breakpoints.up('md')]: {
    borderRadius: '0 0 32px 32px',
  },
}));

const NavButton = styled(Button)(({ theme }) => ({
  color: '#fff',
  padding: theme.spacing(1, 2.5),
  borderRadius: '12px',
  fontWeight: 500,
  fontSize: '0.95rem',
  letterSpacing: 0.5,
  transition: 'all 0.2s',
  backgroundColor: 'rgba(255, 255, 255, 0.05)',
  '&.active': {
    background: 'rgba(255, 255, 255, 0.1)',
    color: '#fff',
  },
  '&:hover': {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
}));

const Navigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isAdmin } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  
  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = () => {
    logout();
    navigate('/login');
    handleClose();
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    handleClose();
  };

  const renderNavButtons = () => {
    if (!user) {
      return null;
    }
    
    if (isAdmin()) {
      return (
        <>
          <Button
            color="inherit"
            onClick={() => navigate('/admin')}
            startIcon={<AdminPanelSettingsIcon />}
          >
            Admin
          </Button>
        </>
      );
    }
    return null;
  };

  const renderMobileMenu = () => (
    <Menu
      anchorEl={anchorEl}
      open={open}
      onClose={handleClose}
      PaperProps={{
        sx: {
          background: 'rgba(18, 18, 18, 0.95)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
          color: '#fff',
          '& .MuiMenuItem-root': {
            color: '#fff',
            '&:hover': {
              background: 'rgba(255, 255, 255, 0.1)',
            },
          },
        },
      }}
    >
      {user ? (
        isAdmin() ? (
          <>
            <MenuItem onClick={() => handleNavigation('/admin')}>
              <AdminPanelSettingsIcon sx={{ mr: 1 }} /> Admin
            </MenuItem>
            <MenuItem onClick={() => handleNavigation('/dashboard')}>
              <DashboardIcon sx={{ mr: 1 }} /> Dashboard
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <PowerSettingsNewIcon sx={{ mr: 1 }} /> Logout
            </MenuItem>
          </>
        ) : (
          <>
            <MenuItem onClick={() => handleNavigation('/quiz')}>
              <QuizIcon sx={{ mr: 1 }} /> Quiz
            </MenuItem>
            <MenuItem onClick={() => handleNavigation('/leaderboard')}>
              <LeaderboardIcon sx={{ mr: 1 }} /> Leaderboard
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <PowerSettingsNewIcon sx={{ mr: 1 }} /> Logout
            </MenuItem>
          </>
        )
      ) : (
        <>
          <MenuItem onClick={() => handleNavigation('/')}>
            <HomeIcon sx={{ mr: 1 }} /> Home
          </MenuItem>
        </>
      )}
    </Menu>
  );

  return (
    <StyledAppBar position="fixed">
      <Toolbar sx={{ 
        justifyContent: 'space-between', 
        alignItems: 'center',
        minHeight: { xs: '64px', sm: '70px' },
        px: { xs: 2, sm: 3, md: 4 }
      }}>
        <Typography 
          variant="h6" 
          component="div" 
          onClick={() => navigate('/')}
          sx={{ 
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: { xs: '1.25rem', sm: '1.5rem' },
            color: '#fff',
          }}
        >
          Car Quiz
        </Typography>

        {isMobile ? (
          <>
            <IconButton
              edge="end"
              color="inherit"
              aria-label="menu"
              onClick={handleMenu}
              sx={{ 
                ml: 2,
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                }
              }}
            >
              <MenuIcon />
            </IconButton>
            {renderMobileMenu()}
          </>
        ) : (
          <Box sx={{ display: { xs: 'none', md: 'flex' } }}>
            {renderNavButtons()}
            {user ? (
              <Tooltip title="Logout">
                <IconButton
                  onClick={handleLogout}
                  sx={{
                    color: '#fff',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    '&:hover': { 
                      backgroundColor: 'rgba(255, 255, 255, 0.15)'
                    }
                  }}
                >
                  <PowerSettingsNewIcon />
                </IconButton>
              </Tooltip>
            ) : (
              <>
                <NavButton
                  onClick={() => navigate('/login')}
                  startIcon={<LoginIcon />}
                >
                  Login
                </NavButton>
                <NavButton
                  onClick={() => navigate('/register')}
                  startIcon={<LoginIcon />}
                >
                  Register
                </NavButton>
              </>
            )}
          </Box>
        )}
      </Toolbar>
    </StyledAppBar>
  );
};

export default Navigation;