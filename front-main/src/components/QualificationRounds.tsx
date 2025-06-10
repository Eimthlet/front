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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Snackbar,
  Divider
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format } from 'date-fns';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import api from '../utils/apiClient';

interface Round {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  question_count: number;
}

const QualificationRounds: React.FC = () => {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingRound, setEditingRound] = useState<Round | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [startDate, setStartDate] = useState<Date | null>(new Date());
  const [endDate, setEndDate] = useState<Date | null>(null);

  const fetchRounds = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/rounds');
      setRounds(response.data.rounds);
    } catch (err) {
      setError('Failed to fetch qualification rounds');
      console.error('Error fetching rounds:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRounds();
  }, []);

  const handleOpenDialog = (round: Round | null = null) => {
    if (round) {
      setEditingRound(round);
      setName(round.name);
      setDescription(round.description || '');
      setIsActive(round.is_active);
      setStartDate(round.start_date ? new Date(round.start_date) : null);
      setEndDate(round.end_date ? new Date(round.end_date) : null);
    } else {
      setEditingRound(null);
      setName('');
      setDescription('');
      setIsActive(true);
      setStartDate(new Date());
      setEndDate(null);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingRound(null);
  };

  const handleSubmit = async () => {
    try {
      const roundData = {
        name,
        description,
        is_active: isActive,
        start_date: startDate?.toISOString(),
        end_date: endDate?.toISOString()
      };

      if (editingRound) {
        await api.put(`/admin/rounds/${editingRound.id}`, roundData);
        setSnackbar({ open: true, message: 'Round updated successfully', severity: 'success' });
      } else {
        await api.post('/admin/rounds', roundData);
        setSnackbar({ open: true, message: 'Round created successfully', severity: 'success' });
      }

      fetchRounds();
      handleCloseDialog();
    } catch (err) {
      setError('Failed to save round');
      console.error('Error saving round:', err);
      setSnackbar({ 
        open: true, 
        message: `Failed to ${editingRound ? 'update' : 'create'} round`, 
        severity: 'error' 
      });
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
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add Round
        </Button>
      </Box>

      <Paper elevation={3}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Questions</TableCell>
                <TableCell>Date Range</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rounds.map((round) => (
                <TableRow key={round.id}>
                  <TableCell>
                    <Typography variant="subtitle1">{round.name}</Typography>
                    {round.description && (
                      <Typography variant="body2" color="textSecondary">
                        {round.description}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Box
                      display="inline-flex"
                      alignItems="center"
                      px={1.5}
                      py={0.5}
                      borderRadius={1}
                      bgcolor={round.is_active ? 'success.light' : 'grey.300'}
                      color={round.is_active ? 'success.contrastText' : 'text.secondary'}
                    >
                      {round.is_active ? 'Active' : 'Inactive'}
                    </Box>
                  </TableCell>
                  <TableCell>{round.question_count} questions</TableCell>
                  <TableCell>
                    {round.start_date 
                      ? new Date(round.start_date).toLocaleDateString() 
                      : 'No start date'}
                    {round.end_date && ` - ${new Date(round.end_date).toLocaleDateString()}`}
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Edit">
                      <IconButton onClick={() => handleOpenDialog(round)}>
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton onClick={() => handleDeleteRound(round.id)}>
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {rounds.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    No qualification rounds found. Create one to get started.
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
          <Box display="flex" flexDirection="column" gap={3} pt={1}>
            <TextField
              label="Round Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
              required
              margin="normal"
            />
            
            <TextField
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              fullWidth
              multiline
              rows={3}
              margin="normal"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  color="primary"
                />
              }
              label="Active"
              labelPlacement="start"
            />

            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <Box display="flex" gap={2}>
                <DatePicker
                  label="Start Date"
                  value={startDate}
                  onChange={(newValue) => setStartDate(newValue)}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      required: true
                    }
                  }}
                />
                <DatePicker
                  label="End Date (Optional)"
                  value={endDate}
                  onChange={(newValue) => setEndDate(newValue)}
                  slotProps={{
                    textField: {
                      fullWidth: true
                    }
                  }}
                  minDate={startDate || undefined}
                />
              </Box>
            </LocalizationProvider>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained" 
            color="primary"
            disabled={!name}
          >
            {editingRound ? 'Update' : 'Create'} Round
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
