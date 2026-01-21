import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Grid, Button, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, CircularProgress,
  Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import { Add as AddIcon, Schedule as ScheduleIcon } from '@mui/icons-material';
import { format } from 'date-fns';
import api from '../../services/apiService';
import { useSnackbar } from '../../context/SnackbarContext';

const TutorSchedules = () => {
  const [schedules, setSchedules] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [academicConfig, setAcademicConfig] = useState({ subjects: [], grades: [] });

  const [formData, setFormData] = useState({
    subject: '',
    grade: '',
    title: '',
    description: '',
    scheduledDate: '',
    startTime: '09:00',
    endTime: '10:00',
    students: [],
    room: '',
    meetingLink: ''
  });

  const { showSnackbar } = useSnackbar();

  const fetchData = async () => {
    try {
      setLoading(true);
      const [schedulesRes, studentsRes, academicRes] = await Promise.all([
        api.get('/schedules'),
        api.get('/tutors/students/assigned'),
        api.get('/academic/config')
      ]);

      setSchedules(schedulesRes.data.schedules || []);
      setStudents(studentsRes.data.students || []);
      setAcademicConfig(academicRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      showSnackbar('Failed to load data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.subject || !formData.grade || !formData.title || 
        !formData.scheduledDate || !formData.startTime || !formData.endTime) {
      showSnackbar('Please fill all required fields.', 'error');
      return;
    }

    try {
      setSubmitting(true);
      await api.post('/schedules', formData);
      showSnackbar('Class schedule created successfully!', 'success');
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      showSnackbar(error.response?.data?.message || 'Failed to create schedule.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      subject: '',
      grade: '',
      title: '',
      description: '',
      scheduledDate: '',
      startTime: '09:00',
      endTime: '10:00',
      students: [],
      room: '',
      meetingLink: ''
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      scheduled: 'primary',
      ongoing: 'warning',
      completed: 'success',
      cancelled: 'error'
    };
    return colors[status] || 'default';
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, color: '#1e293b' }}>
          My Class Schedules
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setDialogOpen(true)}
          sx={{ borderRadius: 2, fontWeight: 600, px: 3, py: 1 }}
        >
          Create Schedule
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '40vh' }}>
          <CircularProgress />
        </Box>
      ) : schedules.length > 0 ? (
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Class</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Date & Time</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Students</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {schedules.map((schedule) => (
                <TableRow key={schedule._id}>
                  <TableCell>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {schedule.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {schedule.subject} • Grade {schedule.grade}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {format(new Date(schedule.scheduledDate), 'MMM dd, yyyy')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {schedule.startTime} - {schedule.endTime}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={`${schedule.students?.length || 0} students`}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={schedule.status}
                      color={getStatusColor(schedule.status)}
                      size="small"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <ScheduleIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No Class Schedules
          </Typography>
          <Button variant="contained" onClick={() => setDialogOpen(true)}>
            Create Your First Schedule
          </Button>
        </Paper>
      )}

      {/* Create Schedule Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>Create New Class</DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ mt: 2 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Subject</InputLabel>
                  <Select name="subject" value={formData.subject} onChange={handleChange}>
                    {academicConfig.subjects?.map((subject) => (
                      <MenuItem key={subject} value={subject}>{subject}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Grade</InputLabel>
                  <Select name="grade" value={formData.grade} onChange={handleChange}>
                    {academicConfig.grades?.map((grade) => (
                      <MenuItem key={grade} value={grade}>Grade {grade}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField name="title" label="Class Title" value={formData.title} onChange={handleChange} fullWidth required />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField name="scheduledDate" label="Date" type="date" value={formData.scheduledDate} onChange={handleChange} fullWidth required InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField name="startTime" label="Start Time" type="time" value={formData.startTime} onChange={handleChange} fullWidth required InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField name="endTime" label="End Time" type="time" value={formData.endTime} onChange={handleChange} fullWidth required InputLabelProps={{ shrink: true }} />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={submitting}>
            {submitting ? <CircularProgress size={24} /> : 'Create Schedule'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TutorSchedules;