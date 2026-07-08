import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, TextField, Button, Paper, Grid,
  CircularProgress, FormControl, InputLabel, Select, MenuItem,
  TableContainer, Table, TableHead, TableRow, TableCell, TableBody,
  Card, CardContent, Chip, IconButton, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import api from '../../services/apiService';
import { marksService } from '../../services/marksService';
import { useSnackbar } from '../../context/SnackbarContext';

const UploadMarks = () => {
  const [tutorProfile, setTutorProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const [commonDetails, setCommonDetails] = useState({
    grade: '',
    subject: '',
    testName: '',
    total: ''
  });

  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [scores, setScores] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // --- My Captured Marks state ---
  const [myMarks, setMyMarks] = useState([]);
  const [loadingMarks, setLoadingMarks] = useState(false);
  const [markFilters, setMarkFilters] = useState({ grade: 'all', subject: 'all' });
  const [editDialog, setEditDialog] = useState({ open: false, markId: null, studentName: '', testName: '', score: '', total: '' });
  const [editSaving, setEditSaving] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, markId: null, studentName: '', testName: '' });
  const [deleting, setDeleting] = useState(false);

  const { showSnackbar } = useSnackbar();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoadingProfile(true);
        const res = await api.get('/tutors/me');
        setTutorProfile(res.data.tutor);
      } catch (err) {
        showSnackbar('Failed to load tutor profile. Please refresh.', 'error');
      } finally {
        setLoadingProfile(false);
      }
    };
    fetchProfile();
  }, [showSnackbar]);

  useEffect(() => {
    const fetchStudents = async () => {
      if (commonDetails.subject && commonDetails.grade) {
        setLoadingStudents(true);
        setStudents([]);
        setScores({});
        try {
          const res = await api.get('/tutors/students/assigned', {
            params: {
              grade: commonDetails.grade,
              subject: commonDetails.subject
            }
          });
          setStudents(res.data.students);
        } catch (err) {
          showSnackbar('Failed to fetch student list for this subject and grade.', 'error');
        } finally {
          setLoadingStudents(false);
        }
      } else {
        setStudents([]);
        setScores({});
      }
    };
    fetchStudents();
  }, [commonDetails.subject, commonDetails.grade, showSnackbar]);

  const fetchMyMarks = useCallback(async () => {
    setLoadingMarks(true);
    try {
      const filters = {};
      if (markFilters.grade !== 'all') filters.grade = markFilters.grade;
      if (markFilters.subject !== 'all') filters.subject = markFilters.subject;
      const data = await marksService.getTutorMarks(filters);
      setMyMarks(data.marks || []);
    } catch (err) {
      showSnackbar(typeof err === 'string' ? err : 'Failed to fetch your captured marks.', 'error');
    } finally {
      setLoadingMarks(false);
    }
  }, [markFilters.grade, markFilters.subject, showSnackbar]);

  useEffect(() => {
    fetchMyMarks();
  }, [fetchMyMarks]);

  const handleCommonChange = (e) => {
    setCommonDetails({ ...commonDetails, [e.target.name]: e.target.value });
  };

  const handleScoreChange = (studentId, value) => {
    setScores(prev => ({
      ...prev,
      [studentId]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return; // guard against double-click creating duplicate marks

    if (!commonDetails.subject || !commonDetails.testName || !commonDetails.total || !commonDetails.grade) {
      showSnackbar('Please fill in all test details: Grade, Subject, Test Name, and Total.', 'error');
      return;
    }

    const total = Number(commonDetails.total);
    if (!Number.isFinite(total) || total <= 0) {
      showSnackbar('Total marks must be a number greater than 0.', 'error');
      return;
    }

    const studentName = (student) => student.user?.name || student._id;

    const invalidStudents = students.filter(student => {
      const raw = scores[student._id];
      if (raw === undefined || raw === '') return false; // blank is handled below
      const score = Number(raw);
      return !Number.isFinite(score) || score < 0 || score > total;
    });
    if (invalidStudents.length > 0) {
      showSnackbar(
        `Scores must be between 0 and ${total}. Please check: ${invalidStudents.map(studentName).join(', ')}`,
        'error'
      );
      return;
    }

    // Blank scores are recorded as 0 — make sure that's intentional
    const blankStudents = students.filter(
      student => scores[student._id] === undefined || scores[student._id] === ''
    );
    if (blankStudents.length > 0) {
      const confirmed = window.confirm(
        `No score was entered for: ${blankStudents.map(studentName).join(', ')}.\n\n` +
        `These students will be recorded as 0/${total}. Continue?`
      );
      if (!confirmed) return;
    }

    const marks = students.map(student => ({
      studentId: student._id,
      score: Number(scores[student._id] || 0),
      total
    }));

    const dataToSubmit = {
      grade: commonDetails.grade,
      subject: commonDetails.subject,
      testName: commonDetails.testName,
      marks: marks
    };

    setSubmitting(true);
    try {
      await api.post('/tutors/marks/upload', dataToSubmit);
      showSnackbar('Marks uploaded successfully!', 'success');
      setCommonDetails(prev => ({ ...prev, testName: '', total: '' }));
      setScores({});
      fetchMyMarks();
    } catch (err) {
      showSnackbar(err.message || 'Failed to upload marks.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // --- Edit handlers ---
  const openEdit = (mark) => {
    setEditDialog({
      open: true,
      markId: mark._id,
      studentName: mark.student?.user?.name || 'Unknown',
      testName: mark.testName || '',
      score: String(mark.score),
      total: String(mark.total)
    });
  };

  const handleEditSave = async () => {
    if (!editDialog.testName.trim()) {
      showSnackbar('Test name is required.', 'error');
      return;
    }
    const total = Number(editDialog.total);
    const score = Number(editDialog.score);
    if (!Number.isFinite(total) || total <= 0) {
      showSnackbar('Total marks must be a number greater than 0.', 'error');
      return;
    }
    if (!Number.isFinite(score) || score < 0 || score > total) {
      showSnackbar(`Score must be a number between 0 and ${total}.`, 'error');
      return;
    }

    setEditSaving(true);
    try {
      await marksService.updateMark(
        editDialog.markId,
        { score, total, testName: editDialog.testName.trim() },
        'tutor'
      );
      showSnackbar('Mark updated successfully!', 'success');
      setEditDialog({ open: false, markId: null, studentName: '', testName: '', score: '', total: '' });
      fetchMyMarks();
    } catch (err) {
      showSnackbar(typeof err === 'string' ? err : 'Failed to update mark.', 'error');
    } finally {
      setEditSaving(false);
    }
  };

  // --- Delete handlers ---
  const openDelete = (mark) => {
    setDeleteDialog({
      open: true,
      markId: mark._id,
      studentName: mark.student?.user?.name || 'Unknown',
      testName: mark.testName || ''
    });
  };

  const handleDeleteConfirm = async () => {
    setDeleting(true);
    try {
      await marksService.deleteMark(deleteDialog.markId, 'tutor');
      showSnackbar('Mark deleted successfully.', 'success');
      setDeleteDialog({ open: false, markId: null, studentName: '', testName: '' });
      fetchMyMarks();
    } catch (err) {
      showSnackbar(typeof err === 'string' ? err : 'Failed to delete mark.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const getScoreColor = (score, total) => {
    const percentage = (score / total) * 100;
    if (percentage >= 80) return "success"; // Distinction
    if (percentage < 40) return "error";    // Fail
    return "default";
  };

  const getPercentage = (score, total) => {
    if (!total) return 0;
    return Math.round((score / total) * 100);
  };

  const formatDate = (iso) =>
    new Date(iso).toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' });

  if (loadingProfile) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ mb: 4, fontWeight: 700, color: '#1e293b' }}>
        Upload Student Marks
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper
            sx={{
              p: 4,
              borderRadius: 3,
              boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
            }}
          >
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, color: '#1e293b', mb: 3 }}>
              Test Details
            </Typography>

            <Box component="form" onSubmit={handleSubmit} noValidate>
              <Grid container spacing={3} sx={{ mb: 4 }}>

                <Grid item xs={12} sm={6} md={3}>
                  {/* --- FIX: Added minWidth and removed placeholder --- */}
                  <FormControl fullWidth required sx={{ minWidth: 120 }}>
                    <InputLabel id="grade-select-label">Grade</InputLabel>
                    <Select
                      labelId="grade-select-label"
                      id="grade-select"
                      name="grade"
                      value={commonDetails.grade}
                      label="Grade"
                      onChange={handleCommonChange}
                      // Removed displayEmpty
                    >
                      {/* Removed placeholder MenuItem */}
                      {tutorProfile?.grades.map((grade) => (
                        <MenuItem key={grade} value={grade}>
                          Grade {grade}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  {/* --- FIX: Added minWidth and removed placeholder --- */}
                  <FormControl fullWidth required sx={{ minWidth: 120 }}>
                    <InputLabel id="subject-select-label">Subject</InputLabel>
                    <Select
                      labelId="subject-select-label"
                      id="subject-select"
                      name="subject"
                      value={commonDetails.subject}
                      label="Subject"
                      onChange={handleCommonChange}
                      // Removed displayEmpty
                    >
                      {/* Removed placeholder MenuItem */}
                      {tutorProfile?.subjects.map((subject) => (
                        <MenuItem key={subject} value={subject}>
                          {subject}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    name="testName"
                    label="Test Name"
                    value={commonDetails.testName}
                    onChange={handleCommonChange}
                    fullWidth
                    required
                    variant="outlined"
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    name="total"
                    label="Total Marks"
                    type="number"
                    value={commonDetails.total}
                    onChange={handleCommonChange}
                    fullWidth
                    required
                    variant="outlined"
                  />
                </Grid>
              </Grid>

              <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, color: '#1e293b', mb: 3 }}>
                Student Scores
              </Typography>

              {loadingStudents ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                  <CircularProgress />
                </Box>
              ) : students.length > 0 ? (
                <TableContainer
                  component={Paper}
                  variant="outlined"
                  sx={{ borderRadius: 2 }}
                >
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>Student Name</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Student ID</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600, width: '200px' }}>Score</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {students.map((student) => (
                        <TableRow
                          key={student._id}
                          sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                        >
                          <TableCell>
                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                              {student.user?.name ?? 'Unknown'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ color: '#64748b', fontFamily: 'monospace' }}>
                              {student._id}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <TextField
                              type="number"
                              size="small"
                              label="Score"
                              variant="outlined"
                              value={scores[student._id] || ''}
                              onChange={(e) => handleScoreChange(student._id, e.target.value)}
                              InputProps={{
                                endAdornment: commonDetails.total ? ` / ${commonDetails.total}` : ' / Total'
                              }}
                              sx={{ width: '180px' }}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                commonDetails.subject && commonDetails.grade && (
                  <Card
                    sx={{
                      textAlign: 'center',
                      py: 6,
                      border: '2px dashed #e2e8f0',
                      backgroundColor: '#f8fafc'
                    }}
                  >
                    <CardContent>
                      <Typography variant="h6" sx={{ color: '#64748b', mb: 1 }}>
                        No Students Found
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                        No students are assigned to {commonDetails.subject} in Grade {commonDetails.grade}.
                      </Typography>
                    </CardContent>
                  </Card>
                )
              )}

              <Button
                type="submit"
                variant="contained"
                color="primary"
                sx={{
                  mt: 4,
                  px: 4,
                  py: 1.5,
                  fontWeight: 600,
                  borderRadius: 2
                }}
                disabled={students.length === 0 || submitting}
              >
                {submitting ? 'Uploading…' : 'Upload All Marks'}
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* --- My Captured Marks --- */}
        <Grid item xs={12}>
          <Paper
            sx={{
              p: 4,
              borderRadius: 3,
              boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h5" sx={{ fontWeight: 600, color: '#1e293b' }}>
                My Captured Marks
              </Typography>
              <Button
                startIcon={<RefreshIcon />}
                onClick={fetchMyMarks}
                sx={{ color: '#64748b' }}
              >
                Refresh
              </Button>
            </Box>

            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small" sx={{ minWidth: 120 }}>
                  <InputLabel id="marks-filter-grade-label">Filter by Grade</InputLabel>
                  <Select
                    labelId="marks-filter-grade-label"
                    value={markFilters.grade}
                    label="Filter by Grade"
                    onChange={(e) => setMarkFilters(prev => ({ ...prev, grade: e.target.value }))}
                  >
                    <MenuItem value="all">All Grades</MenuItem>
                    {tutorProfile?.grades.map((grade) => (
                      <MenuItem key={grade} value={grade}>Grade {grade}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small" sx={{ minWidth: 120 }}>
                  <InputLabel id="marks-filter-subject-label">Filter by Subject</InputLabel>
                  <Select
                    labelId="marks-filter-subject-label"
                    value={markFilters.subject}
                    label="Filter by Subject"
                    onChange={(e) => setMarkFilters(prev => ({ ...prev, subject: e.target.value }))}
                  >
                    <MenuItem value="all">All Subjects</MenuItem>
                    {tutorProfile?.subjects.map((subject) => (
                      <MenuItem key={subject} value={subject}>{subject}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            {loadingMarks ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                <CircularProgress />
              </Box>
            ) : myMarks.length === 0 ? (
              <Card
                sx={{
                  textAlign: 'center',
                  py: 6,
                  border: '2px dashed #e2e8f0',
                  backgroundColor: '#f8fafc'
                }}
              >
                <CardContent>
                  <Typography variant="h6" sx={{ color: '#64748b', mb: 1 }}>
                    No Marks Found
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                    Marks you upload will appear here, where you can edit or delete them.
                  </Typography>
                </CardContent>
              </Card>
            ) : (
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Student</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Grade</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Subject</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Test</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>Score</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 600 }}>%</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 600 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {myMarks.map((mark) => (
                      <TableRow key={mark._id} hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {mark.student?.user?.name ?? 'Unknown'}
                          </Typography>
                        </TableCell>
                        <TableCell>Grade {mark.grade}</TableCell>
                        <TableCell>
                          <Chip label={mark.subject} size="small" color="primary" variant="outlined" />
                        </TableCell>
                        <TableCell>{mark.testName}</TableCell>
                        <TableCell align="right">{mark.score} / {mark.total}</TableCell>
                        <TableCell align="center">
                          <Chip
                            label={`${getPercentage(mark.score, mark.total)}%`}
                            size="small"
                            color={getScoreColor(mark.score, mark.total)}
                          />
                        </TableCell>
                        <TableCell>{formatDate(mark.createdAt)}</TableCell>
                        <TableCell align="center">
                          <Tooltip title="Edit">
                            <IconButton size="small" onClick={() => openEdit(mark)} sx={{ mr: 1 }}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton size="small" color="error" onClick={() => openDelete(mark)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Edit Dialog */}
      <Dialog open={editDialog.open} onClose={() => setEditDialog({ ...editDialog, open: false })} fullWidth maxWidth="sm">
        <DialogTitle>Edit Mark — {editDialog.studentName}</DialogTitle>
        <DialogContent>
          <TextField
            label="Test Name"
            value={editDialog.testName}
            onChange={(e) => setEditDialog({ ...editDialog, testName: e.target.value })}
            fullWidth
            required
            sx={{ mt: 1, mb: 2 }}
          />
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                label="Score"
                type="number"
                value={editDialog.score}
                onChange={(e) => setEditDialog({ ...editDialog, score: e.target.value })}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Total Marks"
                type="number"
                value={editDialog.total}
                onChange={(e) => setEditDialog({ ...editDialog, total: e.target.value })}
                fullWidth
                required
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditDialog({ ...editDialog, open: false })} disabled={editSaving}>Cancel</Button>
          <Button variant="contained" onClick={handleEditSave} disabled={editSaving}>
            {editSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ ...deleteDialog, open: false })}>
        <DialogTitle>Delete Mark</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete {deleteDialog.studentName}'s mark for
            {' '}"{deleteDialog.testName}"? This cannot be undone and the student
            and their parents will be notified.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteDialog({ ...deleteDialog, open: false })} disabled={deleting}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDeleteConfirm} disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UploadMarks;
