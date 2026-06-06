import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Grid, Card, CardContent,
  CircularProgress, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip,
  FormControl, InputLabel, Select, MenuItem, Button,
  TextField, Collapse, Divider
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  People as PeopleIcon,
  Schedule as ScheduleIcon,
  Download as DownloadIcon,
  FilterList as FilterListIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import api from '../../services/apiService';
import { useSnackbar } from '../../context/SnackbarContext';

const STATUS_COLORS = {
  present: 'success',
  absent: 'error',
  late: 'warning',
  excused: 'info',
  'left-early': 'warning'
};

const ClassAttendance = () => {
  const [attendanceData, setAttendanceData] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterSubject, setFilterSubject] = useState('all');
  const [filterGrade, setFilterGrade] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDate, setFilterDate] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [grades, setGrades] = useState([]);

  const [stats, setStats] = useState({ totalClasses: 0, totalStudents: 0, averageAttendance: 0, completedClasses: 0 });

  // Mark Attendance section
  const [markSectionOpen, setMarkSectionOpen] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [markStatuses, setMarkStatuses] = useState({});
  const [markingStudentId, setMarkingStudentId] = useState(null);
  const [classAttendanceMap, setClassAttendanceMap] = useState({});

  const { showSnackbar } = useSnackbar();

  const fetchData = async () => {
    try {
      setLoading(true);
      const [schedulesRes, attendanceRes, studentsRes] = await Promise.all([
        api.get('/schedules', { params: { limit: 200 } }),
        api.get('/attendance/admin/all'),
        api.get('/admin/students')
      ]);

      const scheduleList = schedulesRes.data.schedules || [];
      const records = attendanceRes.data || [];
      const studentList = studentsRes.data.students || [];

      setSchedules(scheduleList);
      setAttendanceData(records);
      setAllStudents(studentList);

      const uniqueSubjects = [...new Set(scheduleList.map(s => s.subject))].sort();
      const uniqueGrades = [...new Set(scheduleList.map(s => s.grade))].sort((a, b) => a - b);
      setSubjects(uniqueSubjects);
      setGrades(uniqueGrades);

      const completedClasses = scheduleList.filter(s => s.status === 'completed').length;
      const totalStudents = scheduleList.reduce((sum, s) => sum + (s.students?.length || 0), 0);
      const presentCount = records.filter(r => r.status === 'present').length;
      const avgAttendance = records.length > 0 ? Math.round((presentCount / records.length) * 100) : 0;
      setStats({ totalClasses: scheduleList.length, totalStudents, averageAttendance: avgAttendance, completedClasses });

      // Build a map of attendanceId keyed by `${classId}_${studentId}` for quick lookup
      const map = {};
      records.forEach(r => {
        if (r.class?._id && r.student?._id) {
          map[`${r.class._id}_${r.student._id}`] = r;
        }
      });
      setClassAttendanceMap(map);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      showSnackbar('Failed to load attendance data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // When a class is selected for marking, initialise statuses
  const handleClassSelect = (classId) => {
    setSelectedClassId(classId);
    if (!classId) { setMarkStatuses({}); return; }
    const cls = schedules.find(s => s._id === classId);
    if (!cls) return;
    const initial = {};
    (cls.students || []).forEach(s => {
      const studentId = s._id || s;
      const existing = classAttendanceMap[`${classId}_${studentId}`];
      initial[studentId] = existing?.status || 'present';
    });
    setMarkStatuses(initial);
  };

  const handleMarkStudent = async (studentId) => {
    if (!selectedClassId) return;
    try {
      setMarkingStudentId(studentId);
      await api.post(`/attendance/classes/${selectedClassId}/mark-student`, {
        studentId,
        status: markStatuses[studentId] || 'present',
        reason: 'Marked by admin'
      });
      showSnackbar('Attendance saved.', 'success');
      // Refresh data to reflect change
      fetchData();
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Failed to mark attendance.', 'error');
    } finally {
      setMarkingStudentId(null);
    }
  };

  const getStudentName = (studentId) => {
    const id = studentId?._id || studentId;
    const found = allStudents.find(s => s._id === id?.toString());
    return found?.user?.name || 'Unknown Student';
  };

  const getStudentGrade = (studentId) => {
    const id = studentId?._id || studentId;
    const found = allStudents.find(s => s._id === id?.toString());
    return found?.grade ? `Grade ${found.grade}` : '—';
  };

  const selectedClass = schedules.find(s => s._id === selectedClassId);
  const enrolledStudents = selectedClass?.students || [];

  // Filtering logic
  const filteredAttendance = attendanceData.filter(record => {
    const classData = record.class || {};
    const matchesSubject = filterSubject === 'all' || classData.subject === filterSubject;
    const matchesGrade = filterGrade === 'all' || classData.grade === filterGrade;
    const matchesStatus = filterStatus === 'all' || record.status === filterStatus;
    let matchesDate = true;
    if (filterDate && classData.scheduledDate) {
      matchesDate = format(new Date(classData.scheduledDate), 'yyyy-MM-dd') === filterDate;
    }
    return matchesSubject && matchesGrade && matchesStatus && matchesDate;
  });

  const exportReport = () => {
    const csvContent = [
      ['Student', 'Grade', 'Subject', 'Date', 'Status', 'Check-in Time'],
      ...filteredAttendance.map(record => [
        record.student?.user?.name || 'Unknown',
        record.student?.grade || 'N/A',
        record.class?.subject || 'N/A',
        record.class?.scheduledDate ? format(new Date(record.class.scheduledDate), 'yyyy-MM-dd') : 'N/A',
        record.status,
        record.checkIn?.time ? format(new Date(record.checkIn.time), 'HH:mm') : 'N/A'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendance_report_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, color: '#1e293b' }}>
          Attendance Tracker
        </Typography>
        <Button
          variant="contained"
          startIcon={<DownloadIcon />}
          onClick={exportReport}
          disabled={filteredAttendance.length === 0}
        >
          Export CSV
        </Button>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent sx={{ textAlign: 'center' }}>
              <ScheduleIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 700 }}>{stats.totalClasses}</Typography>
              <Typography variant="body2" color="text.secondary">Total Classes</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent sx={{ textAlign: 'center' }}>
              <PeopleIcon sx={{ fontSize: 40, color: 'secondary.main', mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 700 }}>{filteredAttendance.length}</Typography>
              <Typography variant="body2" color="text.secondary">Record(s) Found</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent sx={{ textAlign: 'center' }}>
              <TrendingUpIcon sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 700 }}>{stats.averageAttendance}%</Typography>
              <Typography variant="body2" color="text.secondary">Avg. Attendance</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ── Mark Attendance Section ── */}
      <Paper sx={{ mb: 3, borderRadius: 2, overflow: 'hidden' }}>
        <Box
          sx={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            px: 3, py: 2, cursor: 'pointer', backgroundColor: '#f8fafc',
            '&:hover': { backgroundColor: '#f1f5f9' }
          }}
          onClick={() => setMarkSectionOpen(o => !o)}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <EditIcon color="primary" />
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
              Mark Attendance for a Class
            </Typography>
          </Box>
          {markSectionOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </Box>

        <Collapse in={markSectionOpen}>
          <Divider />
          <Box sx={{ p: 3 }}>
            <FormControl size="small" sx={{ minWidth: 340, mb: 3 }}>
              <InputLabel>Select Class</InputLabel>
              <Select
                value={selectedClassId}
                label="Select Class"
                onChange={(e) => handleClassSelect(e.target.value)}
              >
                <MenuItem value=""><em>— Choose a class —</em></MenuItem>
                {schedules.map(s => (
                  <MenuItem key={s._id} value={s._id}>
                    {s.subject} — Grade {s.grade} — {s.title} (
                    {s.scheduledDate ? format(new Date(s.scheduledDate), 'MMM dd, yyyy') : 'No date'})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {selectedClassId && enrolledStudents.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                No students are enrolled in this class.
              </Typography>
            )}

            {selectedClassId && enrolledStudents.length > 0 && (
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#f8fafc' }}>
                      <TableCell sx={{ fontWeight: 600 }}>Student</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Grade</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Current Status</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Mark As</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {enrolledStudents.map((s) => {
                      const studentId = s._id || s;
                      const strId = studentId?.toString();
                      const existing = classAttendanceMap[`${selectedClassId}_${strId}`];
                      return (
                        <TableRow key={strId} hover>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {getStudentName(studentId)}
                            </Typography>
                          </TableCell>
                          <TableCell>{getStudentGrade(studentId)}</TableCell>
                          <TableCell>
                            {existing ? (
                              <Chip
                                label={existing.status}
                                color={STATUS_COLORS[existing.status] || 'default'}
                                size="small"
                                sx={{ textTransform: 'capitalize' }}
                              />
                            ) : (
                              <Typography variant="caption" color="text.secondary">Not marked</Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Select
                              value={markStatuses[strId] || 'present'}
                              onChange={(e) => setMarkStatuses(prev => ({ ...prev, [strId]: e.target.value }))}
                              size="small"
                              sx={{ minWidth: 120 }}
                            >
                              <MenuItem value="present">Present</MenuItem>
                              <MenuItem value="absent">Absent</MenuItem>
                              <MenuItem value="late">Late</MenuItem>
                              <MenuItem value="excused">Excused</MenuItem>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="contained"
                              size="small"
                              disabled={markingStudentId === strId}
                              onClick={() => handleMarkStudent(strId)}
                              sx={{ fontWeight: 600, borderRadius: 1 }}
                            >
                              {markingStudentId === strId ? 'Saving...' : 'Save'}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        </Collapse>
      </Paper>

      {/* Filters Bar */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Subject</InputLabel>
              <Select value={filterSubject} label="Subject" onChange={(e) => setFilterSubject(e.target.value)}>
                <MenuItem value="all">All Subjects</MenuItem>
                {subjects.map((subject) => (
                  <MenuItem key={subject} value={subject}>{subject}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Grade</InputLabel>
              <Select value={filterGrade} label="Grade" onChange={(e) => setFilterGrade(e.target.value)}>
                <MenuItem value="all">All Grades</MenuItem>
                {grades.map((grade) => (
                  <MenuItem key={grade} value={grade}>Grade {grade}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select value={filterStatus} label="Status" onChange={(e) => setFilterStatus(e.target.value)}>
                <MenuItem value="all">All Statuses</MenuItem>
                <MenuItem value="present">Present</MenuItem>
                <MenuItem value="absent">Absent</MenuItem>
                <MenuItem value="late">Late</MenuItem>
                <MenuItem value="excused">Excused</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth size="small" label="Date" type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid item xs={12} md={3}>
            <Button
              variant="outlined" fullWidth
              onClick={() => { setFilterSubject('all'); setFilterGrade('all'); setFilterStatus('all'); setFilterDate(''); }}
              startIcon={<FilterListIcon />}
            >
              Clear Filters
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Data Table */}
      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f8fafc' }}>
              <TableCell sx={{ fontWeight: 600 }}>Student</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Subject</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Grade</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Check-in Time</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredAttendance.length > 0 ? (
              filteredAttendance.map((record) => (
                <TableRow key={record._id} hover>
                  <TableCell>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {record.student?.user?.name || 'Unknown Student'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {record.student?.user?.email}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={record.class?.subject || 'N/A'} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>{record.class?.grade || record.student?.grade || 'N/A'}</TableCell>
                  <TableCell>
                    {record.class?.scheduledDate
                      ? format(new Date(record.class.scheduledDate), 'MMM dd, yyyy')
                      : 'N/A'}
                  </TableCell>
                  <TableCell>
                    {record.checkIn?.time ? (
                      <Chip
                        label={format(new Date(record.checkIn.time), 'HH:mm')}
                        size="small" color="success" variant="outlined"
                      />
                    ) : (
                      <Typography variant="caption" color="text.secondary">-</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={record.status}
                      color={STATUS_COLORS[record.status] || 'default'}
                      size="small"
                      sx={{ textTransform: 'capitalize' }}
                    />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                  <Typography variant="body1" color="text.secondary">
                    No attendance records found matching your filters.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default ClassAttendance;
