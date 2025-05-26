import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Paper,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Snackbar,
  Alert
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import api from '../utils/api';

interface Season {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  is_qualification_round: boolean;
  minimum_score_percentage: number;
  is_active: boolean;
}

interface SeasonFormData {
  name: string;
  startDate: Date | null;
  endDate: Date | null;
  isQualificationRound: boolean;
  minimumScorePercentage: number;
  isActive: boolean;
}

const initialFormData: SeasonFormData = {
  name: '',
  startDate: new Date(),
  endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
  isQualificationRound: false,
  minimumScorePercentage: 60,
  isActive: false
};

const SeasonManagement: React.FC = () => {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState<boolean>(false);
  const [formData, setFormData] = useState<SeasonFormData>(initialFormData);
  const [editMode, setEditMode] = useState<boolean>(false);
  const [currentSeasonId, setCurrentSeasonId] = useState<number | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });
  const [confirmDeleteDialog, setConfirmDeleteDialog] = useState<{ open: boolean; seasonId: number | null }>({
    open: false,
    seasonId: null
  });

  useEffect(() => {
    fetchSeasons();
  }, []);

  const fetchSeasons = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get<Season[]>('/api/admin/seasons');
      setSeasons(response.data);
    } catch (err: any) {
      console.error('Error fetching seasons:', err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch seasons');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (season?: Season) => {
    if (season) {
      // Edit mode
      setFormData({
        name: season.name,
        startDate: new Date(season.start_date),
        endDate: new Date(season.end_date),
        isQualificationRound: season.is_qualification_round,
        minimumScorePercentage: season.minimum_score_percentage,
        isActive: season.is_active
      });
      setEditMode(true);
      setCurrentSeasonId(season.id);
    } else {
      // Create mode
      setFormData(initialFormData);
      setEditMode(false);
      setCurrentSeasonId(null);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleDateChange = (field: 'startDate' | 'endDate', date: Date | null) => {
    setFormData({
      ...formData,
      [field]: date
    });
  };

  const handleSubmit = async () => {
    try {
      // Validate form data
      if (!formData.name || !formData.startDate || !formData.endDate) {
        setSnackbar({
          open: true,
          message: 'Please fill in all required fields',
          severity: 'error'
        });
        return;
      }

      if (formData.startDate > formData.endDate) {
        setSnackbar({
          open: true,
          message: 'End date must be after start date',
          severity: 'error'
        });
        return;
      }

      const payload = {
        name: formData.name,
        startDate: formData.startDate?.toISOString(),
        endDate: formData.endDate?.toISOString(),
        isQualificationRound: formData.isQualificationRound,
        minimumScorePercentage: formData.minimumScorePercentage,
        isActive: formData.isActive
      };

      if (editMode && currentSeasonId) {
        // Update existing season
        await api.put(`/api/admin/seasons/${currentSeasonId}`, payload);
        setSnackbar({
          open: true,
          message: 'Season updated successfully',
          severity: 'success'
        });
      } else {
        // Create new season
        await api.post('/api/admin/seasons', payload);
        setSnackbar({
          open: true,
          message: 'Season created successfully',
          severity: 'success'
        });
      }

      // Close dialog and refresh seasons
      handleCloseDialog();
      fetchSeasons();
    } catch (err: any) {
      console.error('Error saving season:', err);
      setSnackbar({
        open: true,
        message: err.response?.data?.message || err.message || 'Failed to save season',
        severity: 'error'
      });
    }
  };

  const handleDeleteSeason = (seasonId: number) => {
    setConfirmDeleteDialog({
      open: true,
      seasonId
    });
  };

  const confirmDelete = async () => {
    if (!confirmDeleteDialog.seasonId) return;

    try {
      await api.delete(`/api/admin/seasons/${confirmDeleteDialog.seasonId}`);
      setSnackbar({
        open: true,
        message: 'Season deleted successfully',
        severity: 'success'
      });
      fetchSeasons();
    } catch (err: any) {
      console.error('Error deleting season:', err);
      setSnackbar({
        open: true,
        message: err.response?.data?.message || err.message || 'Failed to delete season',
        severity: 'error'
      });
    } finally {
      setConfirmDeleteDialog({
        open: false,
        seasonId: null
      });
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({
      ...snackbar,
      open: false
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  return (
    <Box sx={{ padding: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Season Management</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add New Season
        </Button>
      </Box>

      {loading ? (
        <Typography>Loading seasons...</Typography>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : seasons.length === 0 ? (
        <Alert severity="info">No seasons found. Create a new season to get started.</Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Start Date</TableCell>
                <TableCell>End Date</TableCell>
                <TableCell>Qualification</TableCell>
                <TableCell>Min. Score %</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {seasons.map((season) => (
                <TableRow key={season.id}>
                  <TableCell>{season.name}</TableCell>
                  <TableCell>{formatDate(season.start_date)}</TableCell>
                  <TableCell>{formatDate(season.end_date)}</TableCell>
                  <TableCell>{season.is_qualification_round ? 'Yes' : 'No'}</TableCell>
                  <TableCell>{season.minimum_score_percentage}%</TableCell>
                  <TableCell>
                    <Box
                      sx={{
                        display: 'inline-block',
                        px: 1,
                        py: 0.5,
                        borderRadius: 1,
                        backgroundColor: season.is_active ? 'success.light' : 'grey.300',
                        color: season.is_active ? 'white' : 'text.secondary'
                      }}
                    >
                      {season.is_active ? 'Active' : 'Inactive'}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <IconButton color="primary" onClick={() => handleOpenDialog(season)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton color="error" onClick={() => handleDeleteSeason(season.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Season Form Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{editMode ? 'Edit Season' : 'Create New Season'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Season Name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              fullWidth
              required
            />
            
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <DatePicker
                  label="Start Date"
                  value={formData.startDate}
                  onChange={(date) => handleDateChange('startDate', date)}
                  sx={{ flex: 1 }}
                />
                <DatePicker
                  label="End Date"
                  value={formData.endDate}
                  onChange={(date) => handleDateChange('endDate', date)}
                  sx={{ flex: 1 }}
                />
              </Box>
            </LocalizationProvider>

            <TextField
              label="Minimum Score Percentage"
              name="minimumScorePercentage"
              type="number"
              value={formData.minimumScorePercentage}
              onChange={handleInputChange}
              InputProps={{ inputProps: { min: 0, max: 100 } }}
              fullWidth
            />

            <FormControlLabel
              control={
                <Switch
                  checked={formData.isQualificationRound}
                  onChange={handleInputChange}
                  name="isQualificationRound"
                />
              }
              label="Is Qualification Round"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={formData.isActive}
                  onChange={handleInputChange}
                  name="isActive"
                />
              }
              label="Set as Active Season"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            {editMode ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm Delete Dialog */}
      <Dialog open={confirmDeleteDialog.open} onClose={() => setConfirmDeleteDialog({ open: false, seasonId: null })}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this season? This action cannot be undone.
          </Typography>
          <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
            Note: You cannot delete a season that has questions assigned to it.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDeleteDialog({ open: false, seasonId: null })}>Cancel</Button>
          <Button onClick={confirmDelete} variant="contained" color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SeasonManagement;
