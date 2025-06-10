import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Switch,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
   Snackbar,
  Grid,
  Chip
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import api from '../utils/apiClient';

interface QualificationRound {
  id?: number;
  name: string;
  description: string;
  is_active: boolean;
  start_date: string;
  end_date: string;
  round_number: number;
  min_score_to_qualify?: number;
  season_id?: number;
  created_at?: string;
  updated_at?: string;
}

const defaultRound: Omit<QualificationRound, 'id' | 'created_at' | 'updated_at'> = {
  name: '',
  description: '',
  is_active: true,
  start_date: new Date().toISOString(),
  end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  round_number: 1,
  min_score_to_qualify: 70,
  season_id: 1 // Default to first season
};

const QualificationRounds: React.FC = () => {
  const [rounds, setRounds] = useState<QualificationRound[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingRound, setEditingRound] = useState<QualificationRound | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [round, setRound] = useState<QualificationRound>(defaultRound);
  const [seasons, setSeasons] = useState<any[]>([]);
  
  // Fetch seasons for the dropdown
  useEffect(() => {
    const fetchSeasons = async () => {
      try {
        console.log('Fetching seasons...');
        const response = await api.get('/admin/seasons');
        
        console.log('Full API response:', {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
          data: response.data,
          config: {
            url: response.config?.url,
            method: response.config?.method,
            headers: response.config?.headers
          }
        });
        
        // Handle different response structures
        let seasonsData = [];
        const responseData = response.data;
        
        console.log('Response data type:', typeof responseData);
        console.log('Is array:', Array.isArray(responseData));
        console.log('Response data keys:', responseData ? Object.keys(responseData) : 'null/undefined');
        
        if (Array.isArray(responseData)) {
          // Direct array response
          seasonsData = responseData;
          console.log('Using direct array response with', seasonsData.length, 'items');
        } else if (responseData && Array.isArray(responseData.data)) {
          // Response with data property
          seasonsData = responseData.data;
          console.log('Using response.data with', seasonsData.length, 'items');
        } else if (responseData && Array.isArray(responseData.seasons)) {
          // Response with seasons property
          seasonsData = responseData.seasons;
          console.log('Using response.seasons with', seasonsData.length, 'items');
        } else if (responseData && typeof responseData === 'object') {
          // If it's a single season object, wrap it in an array
          seasonsData = [responseData];
          console.log('Wrapped single season object in array');
        } else {
          console.log('No valid season data found in response');
        }
        
        console.log('Processed seasons data:', seasonsData);
        
        // If no seasons, show error and use a fallback
        if (seasonsData.length === 0) {
          console.warn('No seasons found in the API response');
          setSnackbar({ 
            open: true, 
            message: 'No seasons found. Please create a season first.', 
            severity: 'warning' 
          });
          return;
        }
        
        setSeasons(seasonsData);
        
        // Set the first season as default
        setRound(prev => ({
          ...prev,
          season_id: seasonsData[0].id
        }));
        
      } catch (error) {
        console.error('Error fetching seasons:', error);
        setSnackbar({ 
          open: true, 
          message: 'Failed to load seasons. Please try again later.', 
          severity: 'error' 
        });
      }
    };
    
    fetchSeasons();
  }, []);
  
  // Disable the form if no seasons are available
  const isFormDisabled = seasons.length === 0;

  const fetchRounds = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/rounds');
      // The response data is the rounds array directly
      setRounds(Array.isArray(response.data) ? response.data : response.data?.rounds || []);
    } catch (err) {
      setError('Failed to fetch qualification rounds');
      console.error('Error fetching rounds:', err);
      setRounds([]); // Ensure we always have an array
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRounds();
  }, []);

  const handleOpenDialog = (round: QualificationRound | null = null) => {
    if (round) {
      setEditingRound(round);
      setRound(round);
    } else {
      setEditingRound(null);
      setRound(defaultRound);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingRound(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    setRound(prev => ({
      ...prev,
      [name]: type === 'number' || name === 'season_id' || name === 'round_number' ? Number(value) : value
    }));
  };

  const handleDateChange = (field: 'start_date' | 'end_date') => (date: Date | null) => {
    if (date) {
      // Format date as YYYY-MM-DD
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;
      
      setRound(prev => ({
        ...prev,
        [field]: formattedDate
      }));
    }
  };

  const validateRound = (): boolean => {
    if (!round.name) {
      setError('Name is required');
      return false;
    }
    if (!round.round_number || round.round_number < 1) {
      setError('Round number must be at least 1');
      return false;
    }
    if (!round.start_date) {
      setError('Start date is required');
      return false;
    }
    if (!round.end_date) {
      setError('End date is required');
      return false;
    }
    if (new Date(round.end_date) <= new Date(round.start_date)) {
      setError('End date must be after start date');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    try {
      setError('');
      
      if (!validateRound()) {
        return;
      }

      // Ensure dates are properly formatted as YYYY-MM-DD
      const formatDate = (dateString: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toISOString().split('T')[0];
      };

      const roundData = {
        name: round.name,
        description: round.description || '',
        is_active: round.is_active,
        start_date: formatDate(round.start_date),
        end_date: formatDate(round.end_date),
        round_number: Number(round.round_number),
        min_score_to_qualify: Number(round.min_score_to_qualify) || 70,
        season_id: Number(round.season_id)
      };
      
      console.log('Submitting round data:', roundData);

      if (editingRound && editingRound.id) {
        await api.put(`/admin/rounds/${editingRound.id}`, roundData);
        setSnackbar({ open: true, message: 'Round updated successfully', severity: 'success' });
      } else {
        await api.post('/admin/rounds', roundData);
        setSnackbar({ open: true, message: 'Round created successfully', severity: 'success' });
      }
      handleCloseDialog();
      fetchRounds();
    } catch (err) {
      setError('Failed to save round');
      console.error('Error saving round:', err);
      setSnackbar({ open: true, message: 'Failed to save round', severity: 'error' });
    }
  };

  const handleDeleteRound = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this round? This cannot be undone.')) {
      try {
        await api.delete(`/admin/rounds/${id}`);
        setSnackbar({ open: true, message: 'Round deleted successfully', severity: 'success' });
        fetchRounds();
      } catch (err) {
        setError('Failed to delete round');
        console.error('Error deleting round:', err);
        setSnackbar({ open: true, message: 'Failed to delete round', severity: 'error' });
      }
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" component="h2">
          Qualification Rounds
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={() => handleOpenDialog()}
          startIcon={<AddIcon />}
        >
          Add Round
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer sx={{ maxHeight: 440 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Round #</TableCell>
                <TableCell>Start Date</TableCell>
                <TableCell>End Date</TableCell>
                <TableCell>Min Score</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rounds.map((roundItem) => (
                <TableRow key={roundItem.id}>
                  <TableCell>{roundItem.name}</TableCell>
                  <TableCell>{roundItem.round_number}</TableCell>
                  <TableCell>
                    {roundItem.start_date ? formatDate(roundItem.start_date) : 'N/A'}
                  </TableCell>
                  <TableCell>
                    {roundItem.end_date ? formatDate(roundItem.end_date) : 'N/A'}
                  </TableCell>
                  <TableCell>{roundItem.min_score_to_qualify || 70}%</TableCell>
                  <TableCell>
                    <Chip
                      label={roundItem.is_active ? 'Active' : 'Inactive'}
                      color={roundItem.is_active ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Tooltip title="Edit">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(roundItem)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        onClick={() => roundItem.id && handleDeleteRound(roundItem.id)}
                        color="error"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {rounds.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    No rounds found. Click "Add Round" to create one.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingRound ? 'Edit Qualification Round' : 'Add New Qualification Round'}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              {seasons.length > 0 ? (
                <TextField
                  select
                  fullWidth
                  label="Season"
                  name="season_id"
                  value={round.season_id || ''}
                  onChange={handleInputChange}
                  required
                  SelectProps={{
                    native: true
                  }}
                >
                  {seasons.map((season) => (
                    <option key={season.id} value={season.id}>
                      {season.name}
                    </option>
                  ))}
                </TextField>
              ) : (
                <TextField
                  fullWidth
                  label="Season"
                  value="Loading seasons..."
                  disabled
                />
              )}
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Name"
                name="name"
                value={round.name}
                onChange={handleInputChange}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Round Number"
                name="round_number"
                value={round.round_number}
                onChange={handleInputChange}
                required
                inputProps={{ min: 1 }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Start Date"
                  value={new Date(round.start_date)}
                  onChange={handleDateChange('start_date')}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      required: true
                    }
                  }}
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12} md={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="End Date"
                  value={new Date(round.end_date)}
                  onChange={handleDateChange('end_date')}
                  minDate={new Date(round.start_date)}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      required: true
                    }
                  }}
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Minimum Score to Qualify (%)"
                name="min_score_to_qualify"
                value={round.min_score_to_qualify}
                onChange={handleInputChange}
                inputProps={{ min: 0, max: 100 }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Description"
                name="description"
                value={round.description}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={round.is_active}
                    onChange={(e) =>
                      setRound({ ...round, is_active: e.target.checked })
                    }
                    name="is_active"
                    color="primary"
                  />
                }
                label="Active"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleCloseDialog}
            color="inherit"
            disabled={isFormDisabled}
          >
            {isFormDisabled ? 'Close' : 'Cancel'}
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            color="primary"
            disabled={isFormDisabled || !round.name || !round.start_date || !round.end_date || !round.season_id}
            startIcon={<SaveIcon />}
            title={isFormDisabled ? 'No seasons available. Please create a season first.' : ''}
          >
            {editingRound ? 'Update' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity as 'success' | 'error'}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default QualificationRounds;
