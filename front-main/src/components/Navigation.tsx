import React, { useState } from 'react';
import { 
  AppBar, 
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
import { useNavigate } from 'react-router-dom';
import PowerSettingsNewIcon from '@mui/icons-material/PowerSettingsNew';
import LoginIcon from '@mui/icons-material/Login';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import { useAuth } from '../contexts/AuthContext';
// Using HelpOutline icon as a fallback
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import LeaderboardIcon from '@mui/icons-material/Leaderboard';
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


const Navigation: React.FC = () => {
  const navigate = useNavigate();

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

  // Removed unused isActive function

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
    
    if (isAdmin) {
      return (
        <>
          <Button
            color="inherit"
            onClick={() => navigate('/admin/panel')}
            startIcon={<AdminPanelSettingsIcon />}
            sx={{ mr: 2 }}
          >
            Admin Panel
          </Button>
          <Button
            color="inherit"
            onClick={() => navigate('/admin')}
            startIcon={<DashboardIcon />}
            sx={{ mr: 2 }}
          >
            Dashboard
          </Button>
          <Button
            color="inherit"
            onClick={() => navigate('/admin/users')}
            startIcon={<PeopleIcon />}
          >
            Users
          </Button>
        </>
      );
    } else {
      return (
        <>
          <Button
            color="inherit"
            onClick={() => navigate('/leaderboard')}
            startIcon={<LeaderboardIcon />}
            sx={{ mr: 2 }}
          >
            Leaderboard
          </Button>
        </>
      );
    }
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
        isAdmin ? (
          <>
            <MenuItem onClick={() => handleNavigation('/admin/panel')}>
              <AdminPanelSettingsIcon sx={{ mr: 1 }} /> Admin Panel
            </MenuItem>
            <MenuItem onClick={() => handleNavigation('/admin')}>
              <DashboardIcon sx={{ mr: 1 }} /> Dashboard
            </MenuItem>
            <MenuItem onClick={() => handleNavigation('/admin/users')}>
              <PeopleIcon sx={{ mr: 1 }} /> Users
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <PowerSettingsNewIcon sx={{ mr: 1 }} /> Logout
            </MenuItem>
          </>
        ) : (
          <>
            <MenuItem onClick={() => handleNavigation('/leaderboard')}>
              <LeaderboardIcon sx={{ mr: 1 }} /> Leaderboard
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <PowerSettingsNewIcon sx={{ mr: 1 }} /> Logout
            </MenuItem>
          </>
        )
      ) : (
        <MenuItem onClick={() => handleNavigation('/login')}>
          <LoginIcon sx={{ mr: 1 }} /> Login
        </MenuItem>
      )}
    </Menu>
  );

  return (
    <StyledAppBar position="static">
      <Toolbar>
        <IconButton
          edge="start"
          color="inherit"
          aria-label="menu"
          onClick={handleMenu}
          sx={{ mr: 2 }}
        >
          <MenuIcon />
        </IconButton>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Car Quiz
        </Typography>
        {!isMobile && renderNavButtons()}
        {user ? (
          <Tooltip title="Logout">
            <IconButton color="inherit" onClick={handleLogout}>
              <PowerSettingsNewIcon />
            </IconButton>
          </Tooltip>
        ) : (
          <Tooltip title="Login">
            <IconButton color="inherit" onClick={() => navigate('/login')}>
              <LoginIcon />
            </IconButton>
          </Tooltip>
        )}
      </Toolbar>
      {isMobile && renderMobileMenu()}
    </StyledAppBar>
  );
};

export default Navigation;
