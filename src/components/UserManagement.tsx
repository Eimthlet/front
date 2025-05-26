import React, { useState, useEffect } from 'react';
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
  Pagination,
  CircularProgress,
  Alert,
  Tabs,
  Tab
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LockIcon from '@mui/icons-material/LockOutlined';
import SearchIcon from '@mui/icons-material/SearchOutlined';
import RefreshIcon from '@mui/icons-material/RefreshOutlined';
import api from '../utils/api';

// Types
interface User {
  id: number;
  username: string;
  email: string;
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

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface UsersResponse {
  users: User[];
  pagination: Pagination;
}

interface UserResponse {
  user: User;
}

interface UserManagementProps {}

const UserManagement: React.FC<UserManagementProps> = () => {
  // State
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pagination, setPagination] = useState<Pagination>({
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

  // Fetch users on component mount and when filters change
  useEffect(() => {
    fetchUsers();
  }, [pagination.page, searchQuery, roleFilter, statusFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const queryParams = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString()
      });
      
      if (searchQuery) queryParams.append('search', searchQuery);
      if (roleFilter) queryParams.append('role', roleFilter);
      if (statusFilter) queryParams.append('status', statusFilter);
      
      const response = await api.get<UsersResponse>(`/admin/users?${queryParams.toString()}`);
      
      setUsers(response.data.users);
      setPagination(response.data.pagination);
    } catch (err: any) {
      console.error('Error fetching users:', err);
      setError(err.response?.data?.error || err.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDetails = async (userId: number) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get<UserDetail>(`/admin/users/${userId}`);
      setSelectedUser(response.data);
      setOpenUserDialog(true);
    } catch (err: any) {
      console.error('Error fetching user details:', err);
      setError(err.response?.data?.error || err.message || 'Failed to fetch user details');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const userData = { ...editUser };
      const response = await api.put<UserResponse>(`/admin/users/${selectedUser.id}`, userData);
      
      // Update user in the list
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === selectedUser.id ? { ...user, ...response.data.user } : user
        )
      );
      
      setSuccess('User updated successfully');
      setOpenUserDialog(false);
      
      // Reset form
      setEditUser({});
    } catch (err: any) {
      console.error('Error updating user:', err);
      setError(err.response?.data?.error || err.message || 'Failed to update user');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser) return;
    
    try {
      setLoading(true);
      setError(null);
      
      await api.post(`/admin/users/${selectedUser.id}/reset-password`, { newPassword });
      
      setSuccess('Password reset successfully');
      setOpenPasswordDialog(false);
      
      // Reset form
      setNewPassword('');
    } catch (err: any) {
      console.error('Error resetting password:', err);
      setError(err.response?.data?.error || err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    
    try {
      setLoading(true);
      setError(null);
      
      await api.delete(`/admin/users/${selectedUser.id}?softDelete=true`);
      
      // Remove user from the list or update status
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === selectedUser.id ? { ...user, status: 'inactive' } : user
        )
      );
      
      setSuccess('User deactivated successfully');
      setOpenDeleteDialog(false);
    } catch (err: any) {
      console.error('Error deactivating user:', err);
      setError(err.response?.data?.error || err.message || 'Failed to deactivate user');
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
    fetchUserDetails(user.id);
  };

  const handleOpenPasswordDialog = () => {
    setOpenPasswordDialog(true);
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
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
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
          onClick={fetchUsers}
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
            <DialogTitle>
              User Details: {selectedUser.username}
            </DialogTitle>
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
                    label="Username"
                    fullWidth
                    margin="normal"
                    defaultValue={selectedUser.username}
                    onChange={(e) => setEditUser({ ...editUser, username: e.target.value })}
                  />
                  <TextField
                    label="Email"
                    fullWidth
                    margin="normal"
                    defaultValue={selectedUser.email}
                    onChange={(e) => setEditUser({ ...editUser, email: e.target.value })}
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
        <DialogTitle>Deactivate User</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to deactivate {selectedUser?.username}? 
            This will prevent them from logging in.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>Cancel</Button>
          <Button 
            onClick={handleDeleteUser}
            variant="contained"
            color="error"
          >
            Deactivate
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserManagement;
