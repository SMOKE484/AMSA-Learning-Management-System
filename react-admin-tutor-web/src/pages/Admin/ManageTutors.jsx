import React, { useState, useEffect } from 'react';
import {
  Box, Typography, TextField, Button, Paper, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, CircularProgress,
  Grid, FormControl, InputLabel, Select, MenuItem, Chip, OutlinedInput
} from '@mui/material';
import { format } from 'date-fns';
import api from '../../services/apiService';
import { academicService } from '../../services/academicService';
import { useSnackbar } from '../../context/SnackbarContext';

const ManageTutors = () => {
  const [tutors, setTutors] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    grades: [],
    subjects: []
  });

  const { showSnackbar } = useSnackbar();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [academicConfig, tutorsRes] = await Promise.all([
          academicService.getAcademicConfig(),
          api.get('/admin/tutors')
        ]);
        
        setSubjects(academicConfig.subjects);
        setGrades(academicConfig.grades);
        setTutors(tutorsRes.data.tutors);
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

  const handleMultiSelectChange = (field) => (event) => {
    const { value } = event.target;
    setFormData({
      ...formData,
      [field]: typeof value === 'string' ? value.split(',') : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.password || formData.grades.length === 0 || formData.subjects.length === 0) {
      showSnackbar('All fields are required.', 'error');
      return;
    }

    try {
      setFormLoading(true);
      
      await api.post('/admin/tutors', formData);
      
      showSnackbar('Tutor added successfully!', 'success');
      setFormData({ 
        name: '', 
        email: '', 
        password: '', 
        grades: [], 
        subjects: [] 
      });
      
      const tutorsRes = await api.get('/admin/tutors');
      setTutors(tutorsRes.data.tutors);
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Failed to add tutor.', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ mb: 4, fontWeight: 700, color: '#1e293b' }}>
        Manage Tutors
      </Typography>
      
      {/* Create Tutor Form */}
      <Paper 
        sx={{ 
          p: 4, 
          mb: 4,
          borderRadius: 3,
          boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
        }}
      >
        <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, color: '#1e293b', mb: 3 }}>
          Add New Tutor
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
                <InputLabel id="grades-select-label">Grades</InputLabel>
                <Select
                  labelId="grades-select-label"
                  multiple
                  name="grades"
                  value={formData.grades}
                  onChange={handleMultiSelectChange('grades')}
                  input={<OutlinedInput label="Grades" />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip 
                          key={value} 
                          label={`Grade ${value}`} 
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
                  onChange={handleMultiSelectChange('subjects')}
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
            {formLoading ? <CircularProgress size={24} /> : 'Add Tutor'}
          </Button>
        </Box>
      </Paper>
      
      {/* Tutors List */}
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, color: '#1e293b', mb: 3 }}>
        Existing Tutors ({tutors.length})
      </Typography>
      
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
                <TableCell sx={{ fontWeight: 600 }}>Grades</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Subjects</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Joined</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tutors.map((tutor) => (
                <TableRow 
                  key={tutor._id}
                  sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                >
                  <TableCell>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {tutor.user?.name}
                    </Typography>
                  </TableCell>
                  <TableCell>{tutor.user?.email}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {tutor.grades?.map((grade) => (
                        <Chip 
                          key={grade} 
                          label={`Grade ${grade}`} 
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
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {tutor.subjects.map((subject) => (
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
                      {format(new Date(tutor.createdAt), 'dd MMM yyyy')}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default ManageTutors;