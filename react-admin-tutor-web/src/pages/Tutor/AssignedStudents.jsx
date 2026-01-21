import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, CircularProgress, Select, MenuItem, Button,
  Chip, Grid, FormControl, InputLabel
} from '@mui/material';
import api from '../../services/apiService';
import { useSnackbar } from '../../context/SnackbarContext';

const AssignedStudents = () => {
  const [tutorProfile, setTutorProfile] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [attendance, setAttendance] = useState({});
  const [filters, setFilters] = useState({
    grade: '',
    subject: ''
  });
  const { showSnackbar } = useSnackbar();

  const fetchStudents = async (grade = '', subject = '') => {
    try {
      setLoading(true);
      const params = {};
      if (grade) params.grade = grade;
      if (subject) params.subject = subject;
      
      const res = await api.get('/tutors/students/assigned', { params });
      setStudents(res.data.students);
      
      // Initialize attendance state
      const initialAttendance = res.data.students.reduce((acc, student) => {
        acc[student._id] = 'present';
        return acc;
      }, {});
      setAttendance(initialAttendance);
    } catch (err) {
      showSnackbar('Failed to fetch students.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get('/tutors/me');
        setTutorProfile(res.data.tutor);
        // Load all students initially
        fetchStudents();
      } catch (err) {
        showSnackbar('Failed to load tutor profile.', 'error');
      }
    };
    fetchProfile();
  }, [showSnackbar]);

  const handleFilterChange = (e) => {
    const newFilters = { ...filters, [e.target.name]: e.target.value };
    setFilters(newFilters);
    fetchStudents(newFilters.grade, newFilters.subject);
  };

  const handleAttendanceChange = (studentId, status) => {
    setAttendance(prev => ({ ...prev, [studentId]: status }));
  };

  const handleMarkAttendance = async (studentId) => {
    try {
      const status = attendance[studentId];
      await api.post(`/tutors/students/${studentId}/attendance`, { status });
      showSnackbar(`Attendance for ${students.find(s=>s._id === studentId).user.name} marked as ${status}.`, 'success');
    } catch (err) {
      showSnackbar(err.message || 'Failed to mark attendance.', 'error');
    }
  };

  if (loading && !tutorProfile) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ mb: 4, fontWeight: 700, color: '#1e293b' }}>
        Assigned Students
      </Typography>
      
      <Paper 
        sx={{ 
          p: 4, 
          mb: 3, 
          borderRadius: 3,
          boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
        }}
      >
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: '#1e293b' }}>
          Filter Students
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            {/* --- FIX: Added minWidth and removed placeholder --- */}
            <FormControl fullWidth sx={{ minWidth: 120 }}>
              <InputLabel id="filter-grade-label">Grade</InputLabel>
              <Select
                labelId="filter-grade-label"
                name="grade"
                value={filters.grade}
                label="Grade"
                onChange={handleFilterChange}
                // Removed displayEmpty
              >
                {/* Removed placeholder MenuItem */}
                <MenuItem value="">
                  <em>All Grades</em> {/* Kept this one for the 'All' option */}
                </MenuItem>
                {tutorProfile?.grades.map((grade) => (
                  <MenuItem key={grade} value={grade}>
                    Grade {grade}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            {/* --- FIX: Added minWidth and removed placeholder --- */}
            <FormControl fullWidth sx={{ minWidth: 120 }}>
              <InputLabel id="filter-subject-label">Subject</InputLabel>
              <Select
                labelId="filter-subject-label"
                name="subject"
                value={filters.subject}
                label="Subject"
                onChange={handleFilterChange}
                // Removed displayEmpty
              >
                {/* Removed placeholder MenuItem */}
                <MenuItem value="">
                  <em>All Subjects</em> {/* Kept this one for the 'All' option */}
                </MenuItem>
                {tutorProfile?.subjects.map((subject) => (
                  <MenuItem key={subject} value={subject}>
                    {subject}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>
      
      <Paper 
        sx={{ 
          borderRadius: 3,
          boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
          overflow: 'hidden'
        }}
      >
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, backgroundColor: '#f8fafc' }}>Student Name</TableCell>
                <TableCell sx={{ fontWeight: 600, backgroundColor: '#f8fafc' }}>Email</TableCell>
                <TableCell sx={{ fontWeight: 600, backgroundColor: '#f8fafc' }}>Grade</TableCell>
                <TableCell sx={{ fontWeight: 600, backgroundColor: '#f8fafc' }}>Subjects</TableCell>
                <TableCell sx={{ fontWeight: 600, backgroundColor: '#f8fafc' }}>Attendance Status</TableCell>
                <TableCell sx={{ fontWeight: 600, backgroundColor: '#f8fafc' }}>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {students.map((student) => (
                <TableRow 
                  key={student._id}
                  sx={{ 
                    '&:last-child td, &:last-child th': { border: 0 },
                    '&:hover': { backgroundColor: '#f8fafc' }
                  }}
                >
                  <TableCell>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {student.user.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ color: '#64748b' }}>
                      {student.user.email}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={`Grade ${student.grade}`} 
                      size="small" 
                      color="primary"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {student.subjects.slice(0, 2).map(subject => (
                        <Chip 
                          key={subject} 
                          label={subject} 
                          size="small" 
                          variant="outlined"
                          color="secondary"
                        />
                      ))}
                      {student.subjects.length > 2 && (
                        <Chip 
                          label={`+${student.subjects.length - 2}`} 
                          size="small" 
                          variant="outlined"
                        />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={attendance[student._id] || 'present'}
                      onChange={(e) => handleAttendanceChange(student._id, e.target.value)}
                      size="small"
                      sx={{ minWidth: 120 }}
                    >
                      <MenuItem value="present">Present</MenuItem>
                      <MenuItem value="absent">Absent</MenuItem>
                      <MenuItem value="late">Late</MenuItem>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="contained" 
                      color="primary" 
                      size="small"
                      onClick={() => handleMarkAttendance(student._id)}
                      sx={{ 
                        fontWeight: 600,
                        borderRadius: 1
                      }}
                    >
                      Save
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        {students.length === 0 && !loading && (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Typography variant="h6" sx={{ color: '#64748b' }}>
              No students found
            </Typography>
            <Typography variant="body2" sx={{ color: '#94a3b8' }}>
              {filters.grade || filters.subject 
                ? 'Try adjusting your filters' 
                : 'No students are assigned to your grades and subjects'}
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default AssignedStudents;