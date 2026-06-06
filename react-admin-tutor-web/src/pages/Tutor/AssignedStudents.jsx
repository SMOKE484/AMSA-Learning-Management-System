import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, CircularProgress, Select, MenuItem, Button,
  Chip, Grid, FormControl, InputLabel, Tooltip
} from '@mui/material';
import { format } from 'date-fns';
import api from '../../services/apiService';
import { useSnackbar } from '../../context/SnackbarContext';

const AssignedStudents = () => {
  const [tutorProfile, setTutorProfile] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [attendance, setAttendance] = useState({});
  const [savingId, setSavingId] = useState(null);

  // Filter state (used when no class selected)
  const [filters, setFilters] = useState({ grade: '', subject: '' });

  // Class selector
  const [tutorClasses, setTutorClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');

  const { showSnackbar } = useSnackbar();

  const fetchStudents = async (grade = '', subject = '') => {
    try {
      setLoading(true);
      const params = {};
      if (grade) params.grade = grade;
      if (subject) params.subject = subject;
      const res = await api.get('/tutors/students/assigned', { params });
      setStudents(res.data.students);
      const initial = res.data.students.reduce((acc, s) => {
        acc[s._id] = 'present';
        return acc;
      }, {});
      setAttendance(initial);
    } catch {
      showSnackbar('Failed to fetch students.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchClassStudents = async (classId) => {
    try {
      setLoading(true);
      // Fetch the specific schedule; schedules endpoint returns populated students
      const res = await api.get('/schedules', { params: { limit: 200 } });
      const cls = (res.data.schedules || []).find(s => s._id === classId);
      if (!cls) { setStudents([]); return; }
      // cls.students are populated Student docs with { _id, user: ObjectId, grade }
      // We need full student info; fetch from assigned endpoint and filter
      const assignedRes = await api.get('/tutors/students/assigned', { params: { limit: 500 } });
      const allAssigned = assignedRes.data.students || [];
      const enrolledIds = new Set((cls.students || []).map(s => (s._id || s).toString()));
      const enrolled = allAssigned.filter(s => enrolledIds.has(s._id.toString()));
      setStudents(enrolled);
      const initial = enrolled.reduce((acc, s) => {
        acc[s._id] = 'present';
        return acc;
      }, {});
      setAttendance(initial);
    } catch {
      showSnackbar('Failed to fetch class students.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const profileRes = await api.get('/tutors/me');
        const profile = profileRes.data.tutor;
        setTutorProfile(profile);

        // Fetch tutor's classes
        const schedulesRes = await api.get('/schedules', { params: { limit: 200 } });
        // Backend already scopes GET /schedules to the tutor's classes when role=tutor
        setTutorClasses(schedulesRes.data.schedules || []);

        fetchStudents();
      } catch {
        showSnackbar('Failed to load profile.', 'error');
      }
    };
    init();
  }, []);

  const handleFilterChange = (e) => {
    if (selectedClassId) return; // ignore filter changes when class is active
    const newFilters = { ...filters, [e.target.name]: e.target.value };
    setFilters(newFilters);
    fetchStudents(newFilters.grade, newFilters.subject);
  };

  const handleClassChange = (classId) => {
    setSelectedClassId(classId);
    if (!classId) {
      fetchStudents(filters.grade, filters.subject);
    } else {
      fetchClassStudents(classId);
    }
  };

  const handleAttendanceChange = (studentId, status) => {
    setAttendance(prev => ({ ...prev, [studentId]: status }));
  };

  const handleMarkAttendance = async (studentId) => {
    try {
      setSavingId(studentId);
      const status = attendance[studentId] || 'present';
      const studentName = students.find(s => s._id === studentId)?.user?.name ?? 'Student';

      if (selectedClassId) {
        // New endpoint: class-linked attendance marking
        await api.post(`/attendance/classes/${selectedClassId}/mark-student`, {
          studentId,
          status,
          reason: 'Marked by tutor'
        });
      } else {
        // Fallback: old endpoint (legacy, no class context)
        await api.post(`/tutors/students/${studentId}/attendance`, { status });
      }

      showSnackbar(`${studentName} marked as ${status}.`, 'success');
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Failed to mark attendance.', 'error');
    } finally {
      setSavingId(null);
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

      <Paper sx={{ p: 4, mb: 3, borderRadius: 3, boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: '#1e293b' }}>
          Filter / Select Class
        </Typography>
        <Grid container spacing={2}>
          {/* Class selector */}
          <Grid item xs={12}>
            <FormControl fullWidth size="small">
              <InputLabel id="class-select-label">Select Class (for attendance marking)</InputLabel>
              <Select
                labelId="class-select-label"
                value={selectedClassId}
                label="Select Class (for attendance marking)"
                onChange={(e) => handleClassChange(e.target.value)}
              >
                <MenuItem value=""><em>All students (no class selected)</em></MenuItem>
                {tutorClasses.map((cls) => (
                  <MenuItem key={cls._id} value={cls._id}>
                    {cls.subject} — Grade {cls.grade} — {cls.title}
                    {cls.scheduledDate ? ` (${format(new Date(cls.scheduledDate), 'MMM dd, yyyy')})` : ''}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {!selectedClassId && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                Select a class above to mark attendance for a specific session.
              </Typography>
            )}
          </Grid>

          {/* Grade and Subject filters — only shown when no class selected */}
          {!selectedClassId && (
            <>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth sx={{ minWidth: 120 }}>
                  <InputLabel id="filter-grade-label">Grade</InputLabel>
                  <Select
                    labelId="filter-grade-label"
                    name="grade"
                    value={filters.grade}
                    label="Grade"
                    onChange={handleFilterChange}
                  >
                    <MenuItem value=""><em>All Grades</em></MenuItem>
                    {tutorProfile?.grades.map((grade) => (
                      <MenuItem key={grade} value={grade}>Grade {grade}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth sx={{ minWidth: 120 }}>
                  <InputLabel id="filter-subject-label">Subject</InputLabel>
                  <Select
                    labelId="filter-subject-label"
                    name="subject"
                    value={filters.subject}
                    label="Subject"
                    onChange={handleFilterChange}
                  >
                    <MenuItem value=""><em>All Subjects</em></MenuItem>
                    {tutorProfile?.subjects.map((subject) => (
                      <MenuItem key={subject} value={subject}>{subject}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </>
          )}
        </Grid>
      </Paper>

      <Paper sx={{ borderRadius: 3, boxShadow: '0 4px 6px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
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
                    sx={{ '&:last-child td, &:last-child th': { border: 0 }, '&:hover': { backgroundColor: '#f8fafc' } }}
                  >
                    <TableCell>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {student.user?.name ?? 'Unknown'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: '#64748b' }}>
                        {student.user?.email ?? '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={`Grade ${student.grade}`} size="small" color="primary" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {student.subjects.slice(0, 2).map(subject => (
                          <Chip key={subject} label={subject} size="small" variant="outlined" color="secondary" />
                        ))}
                        {student.subjects.length > 2 && (
                          <Chip label={`+${student.subjects.length - 2}`} size="small" variant="outlined" />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Tooltip title={!selectedClassId ? 'Select a class above to enable attendance marking' : ''}>
                        <span>
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
                        </span>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Tooltip title={!selectedClassId ? 'Select a class first' : ''}>
                        <span>
                          <Button
                            variant="contained"
                            color="primary"
                            size="small"
                            disabled={!selectedClassId || savingId === student._id}
                            onClick={() => handleMarkAttendance(student._id)}
                            sx={{ fontWeight: 600, borderRadius: 1 }}
                          >
                            {savingId === student._id ? 'Saving...' : 'Save'}
                          </Button>
                        </span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        {students.length === 0 && !loading && (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Typography variant="h6" sx={{ color: '#64748b' }}>
              No students found
            </Typography>
            <Typography variant="body2" sx={{ color: '#94a3b8' }}>
              {selectedClassId
                ? 'No students from your assigned list are enrolled in this class'
                : filters.grade || filters.subject
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
