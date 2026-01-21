import React, { useState, useEffect } from 'react';
import {
  Box, Typography, TextField, Button, Paper, Grid,
  CircularProgress, FormControl, InputLabel, Select, MenuItem,
  TableContainer, Table, TableHead, TableRow, TableCell, TableBody,
  Card, CardContent
} from '@mui/material';
import api from '../../services/apiService';
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

    if (!commonDetails.subject || !commonDetails.testName || !commonDetails.total || !commonDetails.grade) {
      showSnackbar('Please fill in all test details: Grade, Subject, Test Name, and Total.', 'error');
      return;
    }

    const marks = students.map(student => ({
      studentId: student._id,
      score: Number(scores[student._id] || 0),
      total: Number(commonDetails.total)
    }));
    
    const dataToSubmit = {
      grade: commonDetails.grade,
      subject: commonDetails.subject,
      testName: commonDetails.testName,
      marks: marks
    };

    try {
      await api.post('/tutors/marks/upload', dataToSubmit);
      showSnackbar('Marks uploaded successfully!', 'success');
      setCommonDetails(prev => ({ ...prev, testName: '', total: '' }));
      setScores({});
    } catch (err) {
      showSnackbar(err.message || 'Failed to upload marks.', 'error');
    }
  };

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
                              {student.user.name}
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
                disabled={students.length === 0}
              >
                Upload All Marks
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default UploadMarks;