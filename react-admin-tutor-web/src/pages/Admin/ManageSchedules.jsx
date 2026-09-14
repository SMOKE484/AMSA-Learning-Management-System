import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Grid, Button, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, CircularProgress,
  Chip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, FormControl, InputLabel, Select, MenuItem, Alert,
  OutlinedInput, FormControlLabel, Switch, InputAdornment
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Schedule as ScheduleIcon,
  Search as SearchIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import api from '../../services/apiService';
import { useSnackbar } from '../../context/SnackbarContext';

const ManageSchedules = () => {
  const [schedules, setSchedules] = useState([]);
  const [scheduleTotal, setScheduleTotal] = useState(0);
  const [statusCounts, setStatusCounts] = useState({ scheduled: 0, ongoing: 0, completed: 0 });
  const [tutors, setTutors] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [academicConfig, setAcademicConfig] = useState({ subjects: [], grades: [] });
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState({
    tutor: '',
    subject: '',
    grade: '',
    title: '',
    description: '',
    scheduledDate: '',
    startTime: '09:00',
    endTime: '10:00',
    students: [],
    autoAssignStudents: true
  });

  const { showSnackbar } = useSnackbar();

  // Fetch data
  const fetchData = async () => {
    try {
      setLoading(true);
      // /schedules is paginated (default limit 10). The table needs a high enough
      // limit to show the whole list, but stats must never be derived from that
      // array's length/filter — they come straight from the backend's totals
      // (pagination.total, and a per-status total for each status count), so
      // they stay correct even past the table's cap. sort: 'desc' puts the
      // newest/most-recently-scheduled classes on top — including anything
      // upcoming, which otherwise sorts to the bottom (and can fall past the
      // 500-row cap entirely) behind a large history of completed classes.
      const [schedulesRes, tutorsRes, studentsRes, academicRes, scheduledRes, ongoingRes, completedRes] = await Promise.all([
        api.get('/schedules', { params: { limit: 500, sort: 'desc' } }),
        api.get('/admin/tutors'),
        api.get('/admin/students'),
        api.get('/academic/config'),
        api.get('/schedules', { params: { status: 'scheduled', limit: 1 } }),
        api.get('/schedules', { params: { status: 'ongoing', limit: 1 } }),
        api.get('/schedules', { params: { status: 'completed', limit: 1 } })
      ]);

      setSchedules(schedulesRes.data.schedules || []);
      setScheduleTotal(schedulesRes.data.pagination?.total ?? schedulesRes.data.schedules?.length ?? 0);
      setStatusCounts({
        scheduled: scheduledRes.data.pagination?.total ?? 0,
        ongoing: ongoingRes.data.pagination?.total ?? 0,
        completed: completedRes.data.pagination?.total ?? 0
      });
      setTutors(tutorsRes.data.tutors || []);
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

  const handleStudentSelection = (event) => {
    const { value } = event.target;
    setFormData({ ...formData, students: value });
  };

  const handleSubmit = async (e) => {
  e.preventDefault();

  if (submitting) return; // in-flight request already covers this submission

  if (!formData.tutor || !formData.subject || !formData.grade || !formData.title ||
      !formData.scheduledDate || !formData.startTime || !formData.endTime) {
    showSnackbar('Please fill all required fields.', 'error');
    return;
  }

  const isEditing = Boolean(editingId);

  try {
    setSubmitting(true);

    if (isEditing) {
      await api.put(`/schedules/${editingId}`, formData);
      showSnackbar('Class schedule updated successfully!', 'success');
    } else {
      await api.post('/schedules', formData);
      showSnackbar('Class schedule created successfully!', 'success');
    }

    setDialogOpen(false);
    resetForm();
    fetchData();
  } catch (error) {
    console.error(`❌ Schedule ${isEditing ? 'update' : 'creation'} failed:`, error);
    console.error('Response:', error.response);

    if (error.response?.status === 403) {
      showSnackbar('Access denied. Please check your permissions.', 'error');
    } else if (error.response?.status === 400 || error.response?.status === 409) {
      showSnackbar(error.response.data.message || 'Invalid request data.', 'error');
    } else {
      showSnackbar(error.response?.data?.message || `Failed to ${isEditing ? 'update' : 'create'} schedule.`, 'error');
    }
    // Leave the dialog open with the entered data so the admin can fix and retry.
  } finally {
    setSubmitting(false);
  }
};

  const resetForm = () => {
    setFormData({
      tutor: '',
      subject: '',
      grade: '',
      title: '',
      description: '',
      scheduledDate: '',
      startTime: '09:00',
      endTime: '10:00',
      students: [],
      autoAssignStudents: true
    });
    setEditingId(null);
  };

  const handleDelete = async (scheduleId) => {
    if (!window.confirm('Are you sure you want to cancel this class?')) return;

    try {
      await api.delete(`/schedules/${scheduleId}`);
      showSnackbar('Class cancelled successfully!', 'success');
      fetchData();
    } catch (error) {
      showSnackbar(error.response?.data?.message || 'Failed to cancel class.', 'error');
    }
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

  // A class that already happened (completed) or was called off (cancelled)
  // has nothing left to edit — the backend also rejects date/time changes
  // for classes in the past.
  const isEditable = (status) => !['completed', 'cancelled'].includes(status);

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (schedule) => {
    setEditingId(schedule._id);
    setFormData({
      tutor: schedule.tutor?._id || '',
      subject: schedule.subject || '',
      grade: schedule.grade || '',
      title: schedule.title || '',
      description: schedule.description || '',
      // scheduledDate is stored as a UTC-midnight instant representing the
      // intended calendar date — read the date portion straight off the ISO
      // string rather than re-parsing through a local Date, which could
      // shift it a day depending on the browser's timezone.
      scheduledDate: schedule.scheduledDate ? schedule.scheduledDate.split('T')[0] : '',
      startTime: schedule.startTime || '09:00',
      endTime: schedule.endTime || '10:00',
      students: (schedule.students || []).map((s) => s._id),
      autoAssignStudents: false
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    resetForm();
  };

  // Search filters the already-loaded table client-side (schedules is capped
  // at 500 rows, small enough that this is instant) — it must never touch
  // scheduleTotal/statusCounts, which stay as the true backend totals.
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredSchedules = normalizedQuery
    ? schedules.filter((schedule) => {
        const haystack = [
          schedule.title,
          schedule.subject,
          schedule.tutor?.user?.name,
          `grade ${schedule.grade}`,
          schedule.status
        ].filter(Boolean).join(' ').toLowerCase();
        return haystack.includes(normalizedQuery);
      })
    : schedules;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, color: '#1e293b' }}>
          Manage Class Schedules
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={openCreateDialog}
          sx={{ 
            borderRadius: 2,
            fontWeight: 600,
            px: 3,
            py: 1
          }}
        >
          Create Schedule
        </Button>
      </Box>

      {/* Stats Overview */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <ScheduleIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              {scheduleTotal}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Total Classes
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
              {statusCounts.scheduled}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Upcoming
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h4" sx={{ fontWeight: 700, color: 'warning.main' }}>
              {statusCounts.ongoing}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Ongoing
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h4" sx={{ fontWeight: 700, color: 'success.main' }}>
              {statusCounts.completed}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Completed
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Search */}
      {!loading && schedules.length > 0 && (
        <TextField
          label="Search classes"
          placeholder="Search by class, tutor, subject, or grade"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          fullWidth
          sx={{ mb: 3 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
              endAdornment: searchQuery && (
                <InputAdornment position="end">
                  <IconButton size="small" aria-label="Clear" onClick={() => setSearchQuery('')}>
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              )
            }
          }}
        />
      )}

      {/* Schedules Table */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '40vh' }}>
          <CircularProgress />
        </Box>
      ) : schedules.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <ScheduleIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No Class Schedules
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Create your first class schedule to get started.
          </Typography>
          <Button variant="contained" onClick={openCreateDialog}>
            Create Schedule
          </Button>
        </Paper>
      ) : filteredSchedules.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <SearchIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No classes match "{searchQuery}"
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Try a different class, tutor, subject, or grade.
          </Typography>
          <Button variant="outlined" onClick={() => setSearchQuery('')}>
            Clear search
          </Button>
        </Paper>
      ) : (
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Class</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Tutor</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Date & Time</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Students</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredSchedules.map((schedule) => (
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
                    {schedule.tutor?.user?.name}
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
                  <TableCell>
                    <IconButton
                      size="small"
                      aria-label="Edit class"
                      onClick={() => openEditDialog(schedule)}
                      disabled={!isEditable(schedule.status)}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      aria-label="Delete class"
                      color="error"
                      onClick={() => handleDelete(schedule._id)}
                      disabled={schedule.status === 'completed'}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Create/Edit Schedule Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={closeDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 600 }}>
          {editingId ? 'Edit Class Schedule' : 'Create New Class Schedule'}
        </DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ mt: 2 }}>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth required>
                  <InputLabel>Tutor</InputLabel>
                  <Select
                    name="tutor"
                    value={formData.tutor}
                    label="Tutor"
                    onChange={handleChange}
                  >
                    {tutors.map((tutor) => (
                      <MenuItem key={tutor._id} value={tutor._id}>
                        {tutor.user?.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth required>
                  <InputLabel>Subject</InputLabel>
                  <Select
                    name="subject"
                    value={formData.subject}
                    label="Subject"
                    onChange={handleChange}
                  >
                    {academicConfig.subjects?.map((subject) => (
                      <MenuItem key={subject} value={subject}>
                        {subject}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth required>
                  <InputLabel>Grade</InputLabel>
                  <Select
                    name="grade"
                    value={formData.grade}
                    label="Grade"
                    onChange={handleChange}
                  >
                    {academicConfig.grades?.map((grade) => (
                      <MenuItem key={grade} value={grade}>
                        Grade {grade}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  name="title"
                  label="Class Title"
                  value={formData.title}
                  onChange={handleChange}
                  fullWidth
                  required
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  name="description"
                  label="Description"
                  value={formData.description}
                  onChange={handleChange}
                  fullWidth
                  multiline
                  rows={2}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  name="scheduledDate"
                  label="Date"
                  type="date"
                  value={formData.scheduledDate}
                  onChange={handleChange}
                  fullWidth
                  required
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 3 }}>
                <TextField
                  name="startTime"
                  label="Start Time"
                  type="time"
                  value={formData.startTime}
                  onChange={handleChange}
                  fullWidth
                  required
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 3 }}>
                <TextField
                  name="endTime"
                  label="End Time"
                  type="time"
                  value={formData.endTime}
                  onChange={handleChange}
                  fullWidth
                  required
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              
              {/* Auto-assign students toggle — create only; editing always shows the
                  explicit roster below, since updating a schedule doesn't re-run
                  auto-assignment server-side. */}
              {!editingId && (
                <Grid size={{ xs: 12 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.autoAssignStudents}
                        onChange={(e) => setFormData({...formData, autoAssignStudents: e.target.checked})}
                        name="autoAssignStudents"
                      />
                    }
                    label="Automatically assign all students in this grade and subject"
                  />
                  {formData.autoAssignStudents && (
                    <Alert severity="info" sx={{ mt: 1 }}>
                      All students enrolled in {formData.subject || 'selected subject'} for Grade {formData.grade || 'selected grade'} will be automatically assigned to this class.
                    </Alert>
                  )}
                </Grid>
              )}

              {/* Manual student selection (create: only when auto-assign is off; edit: always) */}
              {(editingId || !formData.autoAssignStudents) && (
                <Grid size={{ xs: 12 }}>
                  <FormControl fullWidth>
                    <InputLabel>Assign Students</InputLabel>
                    <Select
                      multiple
                      name="students"
                      value={formData.students}
                      onChange={handleStudentSelection}
                      input={<OutlinedInput label="Assign Students" />}
                      renderValue={(selected) => `${selected.length} students selected`}
                    >
                      {students.map((student) => (
                        <MenuItem key={student._id} value={student._id}>
                          {student.user?.name} (Grade {student.grade})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              )}
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={closeDialog}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={submitting}
          >
            {submitting ? <CircularProgress size={24} /> : (editingId ? 'Save Changes' : 'Create Schedule')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ManageSchedules;