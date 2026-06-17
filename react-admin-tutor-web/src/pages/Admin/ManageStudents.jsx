import React, { useState, useEffect } from 'react';
import {
  Box, Typography, TextField, Button, Paper, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, CircularProgress,
  Grid, FormControl, InputLabel, Select, MenuItem, Chip, OutlinedInput,
  IconButton, Dialog, DialogTitle, DialogContent, DialogActions, InputAdornment
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SearchIcon from '@mui/icons-material/Search';
import { format } from 'date-fns';
import api from '../../services/apiService';
import { academicService } from '../../services/academicService';
import { useSnackbar } from '../../context/SnackbarContext';

const ManageStudents = () => {
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    grade: '',
    subjects: [],
    parentIds: ''
  });

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    grade: '',
    subjects: []
  });

  const { showSnackbar } = useSnackbar();
  const [searchQuery, setSearchQuery] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [academicConfig, studentsRes] = await Promise.all([
          academicService.getAcademicConfig(),
          api.get('/admin/students')
        ]);
        
        setSubjects(academicConfig.subjects);
        setGrades(academicConfig.grades);
        setStudents(studentsRes.data.students);
      } catch (err) {
        showSnackbar('Failed to fetch data.', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [showSnackbar]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubjectsChange = (event) => {
    const {
      target: { value },
    } = event;
    setFormData({
      ...formData,
      subjects: typeof value === 'string' ? value.split(',') : value,
    });
  };

  // In the handleSubmit function - fix the grade format
const handleSubmit = async (e) => {
  e.preventDefault();

  if (!formData.name || !formData.email || !formData.password || !formData.grade || formData.subjects.length === 0) {
    showSnackbar('All fields are required.', 'error');
    return;
  }

  try {
    setFormLoading(true);
    
    // FIX: Convert grade to number for backend validation
    const dataToSubmit = {
      name: formData.name.trim(),
      email: formData.email.trim(),
      password: formData.password,
      grade: parseInt(formData.grade), // ← Convert string to number
      subjects: formData.subjects,
      parentIds: formData.parentIds ? formData.parentIds.split(',').map(id => id.trim()).filter(id => id) : []
    };
    
    const response = await api.post('/admin/students', dataToSubmit);
    
    
    showSnackbar('Student added successfully!', 'success');
    setFormData({ 
      name: '', 
      email: '', 
      password: '', 
      grade: '', 
      subjects: [], 
      parentIds: '' 
    });
    
    const studentsRes = await api.get('/admin/students');
    setStudents(studentsRes.data.students);
  } catch (err) {
    console.error('❌ Backend error details:', err.response?.data);
    showSnackbar(err.response?.data?.message || 'Failed to add student.', 'error');
  } finally {
    setFormLoading(false);
  }
};

  const handleDelete = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this student? This cannot be undone.')) return;
    try {
      await api.delete(`/admin/users/${userId}`);
      showSnackbar('Student deleted successfully', 'success');
      const studentsRes = await api.get('/admin/students');
      setStudents(studentsRes.data.students);
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Failed to delete student.', 'error');
    }
  };

  const openEditDialog = (student) => {
    setSelectedStudent(student);
    setEditFormData({
      name: student.user?.name || '',
      email: student.user?.email || '',
      grade: student.grade?.toString() || '',
      subjects: student.subjects || []
    });
    setEditDialogOpen(true);
  };

  const closeEditDialog = () => {
    setEditDialogOpen(false);
    setSelectedStudent(null);
  };

  const handleEditChange = (e) => {
    setEditFormData({ ...editFormData, [e.target.name]: e.target.value });
  };

  const handleEditSubjectsChange = (event) => {
    const { target: { value } } = event;
    setEditFormData({ ...editFormData, subjects: typeof value === 'string' ? value.split(',') : value });
  };

  const handleEditSubmit = async () => {
    if (!editFormData.name || !editFormData.email) {
      showSnackbar('Name and email are required.', 'error');
      return;
    }
    try {
      setEditLoading(true);
      await api.put(`/admin/students/${selectedStudent.user._id}`, {
        name: editFormData.name.trim(),
        email: editFormData.email.trim(),
        grade: parseInt(editFormData.grade),
        subjects: editFormData.subjects
      });
      showSnackbar('Student updated successfully!', 'success');
      closeEditDialog();
      const res = await api.get('/admin/students');
      setStudents(res.data.students);
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Failed to update student.', 'error');
    } finally {
      setEditLoading(false);
    }
  };

  const filteredStudents = students.filter(s => {
    const q = searchQuery.toLowerCase();
    const matchesText = !q || s.user?.name?.toLowerCase().includes(q) || s.user?.email?.toLowerCase().includes(q);
    const matchesGrade = !gradeFilter || String(s.grade) === gradeFilter;
    return matchesText && matchesGrade;
  });

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ mb: 4, fontWeight: 700, color: '#1e293b' }}>
        Manage Students
      </Typography>
      
      {/* Create Student Form */}
      <Paper 
        sx={{ 
          p: 4, 
          mb: 4,
          borderRadius: 3,
          boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
        }}
      >
        <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, color: '#1e293b', mb: 3 }}>
          Add New Student
        </Typography>
        <Box component="form" onSubmit={handleSubmit} noValidate>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField 
                name="name" 
                label="Full Name" 
                value={formData.name} 
                onChange={handleChange} 
                fullWidth 
                required 
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField 
                name="email" 
                label="Email" 
                type="email" 
                value={formData.email} 
                onChange={handleChange} 
                fullWidth 
                required 
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField 
                name="password" 
                label="Password" 
                type="password" 
                value={formData.password} 
                onChange={handleChange} 
                fullWidth 
                required 
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required sx={{ minWidth: 120 }}>
                <InputLabel id="grade-select-label">Grade</InputLabel>
                <Select
                  labelId="grade-select-label"
                  name="grade"
                  value={formData.grade}
                  label="Grade"
                  onChange={handleChange}
                >
                  {grades.map((grade) => (
                    <MenuItem key={grade} value={grade.toString()}>
                      Grade {grade}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth required sx={{ minWidth: 120 }}>
                <InputLabel id="subjects-select-label">Subjects</InputLabel>
                <Select
                  labelId="subjects-select-label"
                  multiple
                  name="subjects"
                  value={formData.subjects}
                  onChange={handleSubjectsChange}
                  input={<OutlinedInput label="Subjects" />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip 
                          key={value} 
                          label={value} 
                          size="small" 
                          sx={{
                            backgroundColor: '#f1f5f9',
                            color: '#1e293b',
                            fontWeight: 500
                          }}
                        />
                      ))}
                    </Box>
                  )}
                >
                  {subjects.map((subject) => (
                    <MenuItem key={subject} value={subject}>
                      {subject}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField 
                name="parentIds" 
                label="Parent User IDs (optional, comma-separated)" 
                value={formData.parentIds} 
                onChange={handleChange} 
                fullWidth 
                placeholder="e.g., 68f9873b1094a67e612aeac5, 6916a1e3a9f83638f6ca704b"
                helperText="Enter parent user IDs separated by commas"
                variant="outlined"
              />
            </Grid>
          </Grid>
          
          <Button 
            type="submit" 
            variant="contained" 
            color="primary" 
            sx={{ 
              mt: 3,
              px: 4,
              py: 1.5,
              fontWeight: 600,
              borderRadius: 2
            }}
            disabled={formLoading}
          >
            {formLoading ? <CircularProgress size={24} /> : 'Add Student'}
          </Button>
        </Box>
      </Paper>
      
      {/* Students List */}
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, color: '#1e293b', mb: 2 }}>
        Existing Students ({filteredStudents.length})
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }}>
        <TextField
          placeholder="Search by name or email…"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          size="small"
          sx={{ width: 320 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
              </InputAdornment>
            ),
          }}
        />
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Grade</InputLabel>
          <Select value={gradeFilter} label="Grade" onChange={e => setGradeFilter(e.target.value)}>
            <MenuItem value="">All grades</MenuItem>
            {grades.map(g => <MenuItem key={g} value={String(g)}>Grade {g}</MenuItem>)}
          </Select>
        </FormControl>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '30vh' }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer 
          component={Paper} 
          variant="outlined"
          sx={{ borderRadius: 2 }}
        >
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Grade</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Subjects</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Parents</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Joined</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredStudents.map((student) => (
                <TableRow 
                  key={student._id}
                  sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                >
                  <TableCell>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {student.user?.name}
                    </Typography>
                  </TableCell>
                  <TableCell>{student.user?.email}</TableCell>
                  <TableCell>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      Grade {student.grade}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {student.subjects.map((subject) => (
                        <Chip 
                          key={subject} 
                          label={subject} 
                          size="small" 
                          variant="outlined"
                          sx={{
                            borderColor: '#e2e8f0',
                            color: '#64748b',
                            fontWeight: 500
                          }}
                        />
                      ))}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ color: '#64748b' }}>
                      {student.parents?.length || 0} linked
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ color: '#64748b' }}>
                      {format(new Date(student.createdAt), 'dd MMM yyyy')}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <IconButton
                      color="primary"
                      size="small"
                      title="Edit Student"
                      onClick={() => openEditDialog(student)}
                      sx={{ mr: 0.5 }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      color="error"
                      size="small"
                      title="Delete Student"
                      onClick={() => handleDelete(student.user._id)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {filteredStudents.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    No students match your search
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Edit Student Dialog */}
      <Dialog open={editDialogOpen} onClose={closeEditDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600, color: '#1e293b' }}>
          Edit Student
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                name="name"
                label="Full Name"
                value={editFormData.name}
                onChange={handleEditChange}
                fullWidth
                required
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="email"
                label="Email"
                type="email"
                value={editFormData.email}
                onChange={handleEditChange}
                fullWidth
                required
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel id="edit-grade-label">Grade</InputLabel>
                <Select
                  labelId="edit-grade-label"
                  name="grade"
                  value={editFormData.grade}
                  label="Grade"
                  onChange={handleEditChange}
                >
                  {grades.map((g) => (
                    <MenuItem key={g} value={g.toString()}>Grade {g}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel id="edit-subjects-label">Subjects</InputLabel>
                <Select
                  labelId="edit-subjects-label"
                  multiple
                  value={editFormData.subjects}
                  onChange={handleEditSubjectsChange}
                  input={<OutlinedInput label="Subjects" />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((v) => (
                        <Chip key={v} label={v} size="small" sx={{ backgroundColor: '#f1f5f9', fontWeight: 500 }} />
                      ))}
                    </Box>
                  )}
                >
                  {subjects.map((s) => (
                    <MenuItem key={s} value={s}>{s}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={closeEditDialog} sx={{ fontWeight: 600, color: '#64748b' }}>
            Cancel
          </Button>
          <Button
            onClick={handleEditSubmit}
            variant="contained"
            disabled={editLoading}
            sx={{ fontWeight: 600, borderRadius: 2 }}
          >
            {editLoading ? <CircularProgress size={22} /> : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ManageStudents;