import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  CircularProgress,
  Alert,
  Tabs,
  Tab
} from '@mui/material';
import { Pagination } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LockIcon from '@mui/icons-material/LockOutlined';
import SearchIcon from '@mui/icons-material/SearchOutlined';
import RefreshIcon from '@mui/icons-material/RefreshOutlined';
import api from '../utils/apiClient';

// Response type for users API
// Using direct array response from API

// Component Types
interface User {
  id: number;
  username: string;
  email: string;
  phone?: string;
  role: string;
  status: string;
  is_disqualified: boolean;
  created_at: string;
  updated_at: string;
  attempt_count?: number;
  highest_score?: number;
}

interface UserDetail extends User {
  attempts: UserAttempt[];
  qualifications: UserQualification[];
}

interface UserAttempt {
  id: number;
  score: number;
  total_questions: number;
  completed: boolean;
  started_at: string;
  completed_at: string | null;
  season_id: number | null;
  season_name: string | null;
  round_id: number | null;
  round_name: string | null;
  percentage_score: number;
}

interface UserQualification {
  id: number;
  score: number;
  completed_at: string;
  season_id: number;
  season_name: string;
  round_id: number | null;
  round_name: string | null;
  minimum_score_percentage: number;
  percentage_score: number;
}



interface PaginationData {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Using direct array response from API

interface UserManagementProps {}

const UserManagement: React.FC<UserManagementProps> = (): JSX.Element => {
  // State
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Define error state interface and initialize state
  interface ErrorState {
    message: string;
    details?: string;
  }

  const [error, setError] = useState<ErrorState | null>(null);
  
  // Helper function to set error state
  const handleError = useCallback((message: string, details?: string) => {
    setError({ message, details });
  }, [setError]);
  
  // Helper function to clear error state
  const clearError = useCallback(() => {
    setError(null);
  }, [setError]);
  const [success, setSuccess] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationData>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [openUserDialog, setOpenUserDialog] = useState(false);
  const [openPasswordDialog, setOpenPasswordDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [editUser, setEditUser] = useState<Partial<User>>({});
  const [tabValue, setTabValue] = useState(0);

  // Memoize the fetchUsers function to prevent unnecessary re-renders
  const fetchUsers = useCallback(async (page = 1, limit = 10, search = '', role = '', status = '') => {
    try {
      setLoading(true);
      clearError();
      
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });
      
      if (search) queryParams.append('search', search);
      if (role) queryParams.append('role', role);
      if (status) queryParams.append('status', status);
      
      const apiUrl = `/admin/users?${queryParams.toString()}`;
      console.log('Fetching users from:', apiUrl);
      
      // Make the API call and handle the response
      // The 'api.get' from apiClient.ts returns the data array directly.
      const usersArray = await api.get(apiUrl) as User[]; // Expect an array of User objects
      
      console.log('API Response - Users (should be an array):', usersArray); // Log the actual data received
      
      if (usersArray && Array.isArray(usersArray)) {
        setUsers(usersArray);
        // Pagination data (total users, total pages) is ideally part of the API response object
        // or in response headers. Currently, usersArray is just the list for the current page.
        // This pagination setup is a placeholder until backend provides full pagination metadata.
        setPagination(prev => ({
          ...prev,
          total: usersArray.length, // This is count for current page, not overall total.
          page: page, // Current page number from request
          limit: limit, // Items per page from request
          // totalPages should be Math.ceil(totalOverallUsers / limit).
          // Placeholder: if usersArray.length is 0, totalPages is 0.
          // Otherwise, if usersArray.length > 0 but less than limit, it's the last page for current data set.
          // If usersArray.length === limit, there might be more pages.
          // This is a guess. A robust solution needs total count from backend.
          totalPages: usersArray.length > 0 ? (usersArray.length < limit ? page : page +1) : 0 
                      // A simpler placeholder: Math.ceil(usersArray.length / limit) || (usersArray.length > 0 ? 1 : 0)
                      // Let's use: if we get users, assume at least 1 page, if less than limit, current page is total pages. If equal to limit, assume more pages. This is still a heuristic.
                      // For now, a basic calculation based on current page's data, knowing it's not fully accurate for server-side pagination.
                      // totalPages: usersArray.length > 0 ? Math.ceil(usersArray.length / limit) : 0 // This is only correct if usersArray is ALL users.
        }));
        console.log(`Found ${usersArray.length} users (on current page)`);
      } else {
        console.error('Expected an array of users, but received:', usersArray);
        handleError('Failed to fetch users', 'Invalid response format from server or no users found.');
        setUsers([]); 
        setPagination(prev => ({ ...prev, total: 0, totalPages: 0, page: 1 }));
      }
    } catch (err: any) {
      console.error('Error fetching users:', err);
      handleError('Failed to fetch users', err.message || 'An unknown error occurred');
      setUsers([]); 
      setPagination(prev => ({ ...prev, total: 0, totalPages: 0, page: 1 }));
    } finally {
      setLoading(false);
    }
  }, [handleError, clearError]); // Removed dependencies since we're using parameters

  // Fetch users on component mount and when filters change
  useEffect(() => {
    fetchUsers().catch(err => {
      console.error('Error in fetchUsers effect:', err);
    });
  }, [fetchUsers]);

  // User details are handled in handleViewUser
  // fetchUserDetails function removed as it was unused

  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    
    try {
      setLoading(true);
      clearError();
      
      // Ensure is_disqualified is properly set as a boolean
      const userData = {
        username: editUser.username,
        email: editUser.email,
        phone: editUser.phone,
        is_disqualified: Boolean(editUser.is_disqualified), // Ensure boolean
        role: editUser.role
      };
      
      // Update the user
      const response = await api.put(`/admin/user/${editUser.id}`, userData);
      
      if (response?.data?.success) {
        // Refresh the users list to get the latest data
        await fetchUsers(pagination.page, pagination.limit, searchQuery, roleFilter, statusFilter);
        
        // If the current user is being deactivated, update the selected user
        if (selectedUser && selectedUser.id === editUser.id) {
          setSelectedUser(prev => prev ? { ...prev, is_disqualified: userData.is_disqualified } : null);
        }
        
        setSuccess('User updated successfully');
        setOpenUserDialog(false);
        
        // Reset form
        setEditUser({});
      } else {
        throw new Error(response?.data?.error || 'Failed to update user');
      }
    } catch (err) {
      console.error('Error updating user:', err);
      handleError(
        'Failed to update user',
        err instanceof Error ? err.message : 'Unknown error occurred'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser) return;
    
    try {
      setLoading(true);
      clearError();
      
      await api.post(`/admin/user/${selectedUser.id}/reset-password`, { newPassword });
      
      setSuccess('Password reset successfully');
      setOpenPasswordDialog(false);
      
      // Reset form
      setNewPassword('');
    } catch (err) {
      console.error('Error resetting password:', err);
      handleError(
        'Failed to reset password',
        err instanceof Error ? err.message : 'Unknown error occurred'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    
    try {
      setLoading(true);
      clearError();
      
      await api.delete(`/admin/user/${selectedUser.id}`);
      
      // Remove user from the list or update status
      setUsers(prevUsers => 
        prevUsers.filter(user => user.id !== selectedUser.id)
      );
      
      setSuccess('User deleted successfully');
      setOpenDeleteDialog(false);
    } catch (err) {
      console.error('Error deleting user:', err);
      handleError(
        'Failed to delete user',
        err instanceof Error ? err.message : 'Unknown error occurred'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setPagination(prev => ({ ...prev, page: value }));
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page on new search
  };

  const handleViewUser = (user: User) => {
    try {
      setSelectedUser(user as UserDetail);
      setEditUser({
        username: user.username,
        email: user.email,
        role: user.role,
        status: user.status,
        is_disqualified: user.is_disqualified
      });
      setOpenUserDialog(true);
    } catch (err) {
      console.error('Error viewing user:', err);
      handleError(
        'Failed to view user details',
        err instanceof Error ? err.message : 'Unknown error occurred'
      );
    }
  };

  const handleCloseUserDialog = () => {
    setOpenUserDialog(false);
    setSelectedUser(null);
    setEditUser({});
  };

  const handleClosePasswordDialog = () => {
    setOpenPasswordDialog(false);
    setNewPassword('');
  };

  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        User Management
      </Typography>
      
      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 2 }} 
          onClose={() => setError(null)}
        >
          <div>
            <div>{error.message}</div>
            {error.details && (
              <div style={{ marginTop: '8px', fontSize: '0.875rem' }}>
                {error.details}
              </div>
            )}
          </div>
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}
      
      {/* Search and Filters */}
      <Box sx={{ mb: 3, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px' }}>
          <TextField
            label="Search users"
            variant="outlined"
            size="small"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ minWidth: 200 }}
          />
          <Button 
            type="submit" 
            variant="contained" 
            startIcon={<SearchIcon />}
          >
            Search
          </Button>
        </form>
        
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Role</InputLabel>
          <Select
            value={roleFilter}
            label="Role"
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPagination(prev => ({ ...prev, page: 1 }));
            }}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="admin">Admin</MenuItem>
            <MenuItem value="user">User</MenuItem>
          </Select>
        </FormControl>
        
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={statusFilter}
            label="Status"
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPagination(prev => ({ ...prev, page: 1 }));
            }}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="inactive">Inactive</MenuItem>
          </Select>
        </FormControl>
        
        <Button 
          variant="outlined" 
          startIcon={<RefreshIcon />}
          onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
            e.preventDefault();
            fetchUsers(1, pagination.limit, searchQuery, roleFilter, statusFilter);
          }}
        >
          Refresh
        </Button>
      </Box>
      
      {/* Users Table */}
      {loading && !users.length ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ mb: 3 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Username</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Quiz Attempts</TableCell>
                <TableCell>Highest Score</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.username}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Chip 
                        label={user.role} 
                        color={user.role === 'admin' ? 'primary' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={user.status} 
                        color={user.status === 'active' ? 'success' : 'error'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{user.attempt_count || 0}</TableCell>
                    <TableCell>{user.highest_score || 'N/A'}</TableCell>
                    <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <IconButton 
                        size="small" 
                        onClick={() => handleViewUser(user)}
                        title="View/Edit User"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        onClick={() => {
                          setSelectedUser(user as UserDetail);
                          setOpenPasswordDialog(true);
                        }}
                        title="Reset Password"
                      >
                        <LockIcon fontSize="small" />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        onClick={() => {
                          setSelectedUser(user as UserDetail);
                          setOpenDeleteDialog(true);
                        }}
                        title="Deactivate User"
                        disabled={user.status === 'inactive'}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      
      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Pagination 
            count={pagination.totalPages} 
            page={pagination.page} 
            onChange={handlePageChange}
            color="primary"
          />
        </Box>
      )}
      
      {/* User Details Dialog */}
      <Dialog open={openUserDialog} onClose={handleCloseUserDialog} maxWidth="md" fullWidth>
        {selectedUser && (
          <>
            <DialogTitle>{editUser.id ? `Edit User: ${editUser.username}` : (selectedUser ? `View User Details: ${selectedUser.username}` : 'User Details')}</DialogTitle>
            <DialogContent>
              <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                <Tabs value={tabValue} onChange={handleTabChange}>
                  <Tab label="User Info" />
                  <Tab label="Quiz Attempts" />
                  <Tab label="Qualifications" />
                </Tabs>
              </Box>
              
              {tabValue === 0 && (
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                  <TextField
                    margin="dense"
                    label="Phone Number"
                    type="text"
                    fullWidth
                    value={editUser.phone || ''}
                    onChange={(e) => editUser.id && setEditUser({ ...editUser, phone: e.target.value })}
                    InputProps={{
                      readOnly: !editUser.id,
                    }}
                    disabled={!editUser.id}
                  />
                  {editUser.id && (
                    <FormControl fullWidth margin="dense">
                      <InputLabel id="role-select-label">Role</InputLabel>
                      <Select
                        labelId="role-select-label"
                        value={editUser.role || 'user'}
                        label="Role"
                        onChange={(e) => setEditUser({ ...editUser, role: e.target.value as string })}
                      >
                        <MenuItem value="user">User</MenuItem>
                        <MenuItem value="admin">Admin</MenuItem>
                        {/* Add other roles if they exist */}
                      </Select>
                    </FormControl>
                  )}
                  <TextField
                    label="Username"
                    fullWidth
                    margin="normal"
                    defaultValue={selectedUser.username}
                    onChange={(e) => editUser.id && setEditUser({ ...editUser, username: e.target.value })}
                    InputProps={{
                      readOnly: !editUser.id, // Make read-only if just viewing
                    }}
                    disabled={!editUser.id}
                  />
                  <TextField
                    label="Email Address"
                    fullWidth
                    margin="normal"
                    defaultValue={selectedUser.email}
                    onChange={(e) => editUser.id && setEditUser({ ...editUser, email: e.target.value })}
                    InputProps={{
                      readOnly: !editUser.id, // Make read-only if just viewing
                    }}
                    disabled={!editUser.id}
                  />
                  <FormControl fullWidth margin="normal">
                    <InputLabel>Role</InputLabel>
                    <Select
                      defaultValue={selectedUser.role}
                      label="Role"
                      onChange={(e) => setEditUser({ ...editUser, role: e.target.value })}
                    >
                      <MenuItem value="user">User</MenuItem>
                      <MenuItem value="admin">Admin</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControl fullWidth margin="normal">
                    <InputLabel>Status</InputLabel>
                    <Select
                      defaultValue={selectedUser.status}
                      label="Status"
                      onChange={(e) => setEditUser({ ...editUser, status: e.target.value })}
                    >
                      <MenuItem value="active">Active</MenuItem>
                      <MenuItem value="inactive">Inactive</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControl fullWidth margin="normal">
                    <InputLabel>Disqualified</InputLabel>
                    <Select
                      defaultValue={selectedUser.is_disqualified ? 'true' : 'false'}
                      label="Disqualified"
                      onChange={(e) => setEditUser({ 
                        ...editUser, 
                        is_disqualified: e.target.value === 'true' 
                      })}
                    >
                      <MenuItem value="false">No</MenuItem>
                      <MenuItem value="true">Yes</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              )}
              
              {tabValue === 1 && (
                <TableContainer component={Paper} sx={{ maxHeight: 300 }}>
                  <Table stickyHeader size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Season</TableCell>
                        <TableCell>Score</TableCell>
                        <TableCell>Percentage</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedUser.attempts && selectedUser.attempts.length > 0 ? (
                        selectedUser.attempts.map((attempt) => (
                          <TableRow key={attempt.id}>
                            <TableCell>
                              {new Date(attempt.started_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              {attempt.season_name || 'N/A'}
                            </TableCell>
                            <TableCell>
                              {attempt.score} / {attempt.total_questions}
                            </TableCell>
                            <TableCell>
                              {attempt.percentage_score.toFixed(1)}%
                            </TableCell>
                            <TableCell>
                              <Chip 
                                label={attempt.completed ? 'Completed' : 'In Progress'} 
                                color={attempt.completed ? 'success' : 'warning'}
                                size="small"
                              />
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} align="center">
                            No quiz attempts found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
              
              {tabValue === 2 && (
                <TableContainer component={Paper} sx={{ maxHeight: 300 }}>
                  <Table stickyHeader size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Season</TableCell>
                        <TableCell>Score</TableCell>
                        <TableCell>Required %</TableCell>
                        <TableCell>Achieved %</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedUser.qualifications && selectedUser.qualifications.length > 0 ? (
                        selectedUser.qualifications.map((qual) => (
                          <TableRow key={qual.id}>
                            <TableCell>
                              {new Date(qual.completed_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              {qual.season_name}
                            </TableCell>
                            <TableCell>
                              {qual.score}
                            </TableCell>
                            <TableCell>
                              {qual.minimum_score_percentage}%
                            </TableCell>
                            <TableCell>
                              {qual.percentage_score.toFixed(1)}%
                            </TableCell>
                            <TableCell>
                              <Chip 
                                label={qual.percentage_score >= qual.minimum_score_percentage ? 'Qualified' : 'Failed'} 
                                color={qual.percentage_score >= qual.minimum_score_percentage ? 'success' : 'error'}
                                size="small"
                              />
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} align="center">
                            No qualification records found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseUserDialog}>Cancel</Button>
              <Button 
                onClick={handleUpdateUser}
                variant="contained"
                disabled={Object.keys(editUser).length === 0}
              >
                Save Changes
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
      
      {/* Reset Password Dialog */}
      <Dialog open={openPasswordDialog} onClose={handleClosePasswordDialog}>
        <DialogTitle>Reset Password</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="New Password"
            type="password"
            fullWidth
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            helperText="Password must be at least 8 characters long"
            autoComplete="new-password"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePasswordDialog}>Cancel</Button>
          <Button 
            onClick={handleResetPassword}
            variant="contained"
            disabled={!newPassword || newPassword.length < 8}
          >
            Reset Password
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete User Dialog */}
      <Dialog open={openDeleteDialog} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Delete User: {selectedUser?.username}</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to deactivate {selectedUser?.username}? 
            This action is irreversible and will permanently remove the user.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>Cancel</Button>
          <Button 
            onClick={handleDeleteUser}
            variant="contained"
            color="error"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserManagement;
