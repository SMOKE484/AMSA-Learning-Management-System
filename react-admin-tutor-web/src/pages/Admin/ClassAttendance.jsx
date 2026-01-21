import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Grid, Card, CardContent,
  CircularProgress, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip,
  FormControl, InputLabel, Select, MenuItem, Button, TextField
} from '@mui/material';
import { 
  TrendingUp as TrendingUpIcon,
  People as PeopleIcon,
  Schedule as ScheduleIcon,
  Download as DownloadIcon,
  FilterList as FilterListIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import api from '../../services/apiService';
import { useSnackbar } from '../../context/SnackbarContext';

const ClassAttendance = () => {
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // ---Filters ---
  const [filterSubject, setFilterSubject] = useState('all');
  const [filterGrade, setFilterGrade] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all'); 
  const [filterDate, setFilterDate] = useState('');

  // Dropdown options
  const [subjects, setSubjects] = useState([]);
  const [grades, setGrades] = useState([]);

  const [stats, setStats] = useState({
    totalClasses: 0,
    totalStudents: 0,
    averageAttendance: 0,
    completedClasses: 0
  });

  const { showSnackbar } = useSnackbar();

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [schedulesRes, attendanceRes] = await Promise.all([
        api.get('/schedules'),
        api.get('/attendance/admin/all') 
      ]);

      const schedules = schedulesRes.data.schedules || [];
      const records = attendanceRes.data || [];

      setAttendanceData(records);

      // Extract unique Subjects and Grades for filter dropdowns
      const uniqueSubjects = [...new Set(schedules.map(s => s.subject))].sort();
      const uniqueGrades = [...new Set(schedules.map(s => s.grade))].sort((a, b) => a - b);
      
      setSubjects(uniqueSubjects);
      setGrades(uniqueGrades);

      // --- Calculate Statistics ---
      const completedClasses = schedules.filter(s => s.status === 'completed').length;
      const totalStudents = schedules.reduce((sum, schedule) => 
        sum + (schedule.students?.length || 0), 0
      );
      
      const presentCount = records.filter(r => r.status === 'present').length;
      const avgAttendance = records.length > 0 
        ? Math.round((presentCount / records.length) * 100) 
        : 0;

      setStats({
        totalClasses: schedules.length,
        totalStudents,
        averageAttendance: avgAttendance,
        completedClasses
      });

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

  const getAttendanceStatusColor = (status) => {
    const colors = {
      present: 'success',
      absent: 'error',
      late: 'warning',
      excused: 'info',
      'left-early': 'warning'
    };
    return colors[status] || 'default';
  };

  // --- UPDATED Filtering Logic ---
  const filteredAttendance = attendanceData.filter(record => {
    const classData = record.class || {};
    
    // 1. Filter by Subject
    const matchesSubject = filterSubject === 'all' || classData.subject === filterSubject;
    
    // 2. Filter by Grade
    const matchesGrade = filterGrade === 'all' || classData.grade === filterGrade;
    
    // 3. Filter by Status
    const matchesStatus = filterStatus === 'all' || record.status === filterStatus;

    // 4. Filter by Date
    let matchesDate = true;
    if (filterDate && classData.scheduledDate) {
      const recordDate = format(new Date(classData.scheduledDate), 'yyyy-MM-dd');
      matchesDate = recordDate === filterDate;
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

      {/* Filters Bar */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Grid container spacing={2} alignItems="center">
          
          {/* Subject Filter */}
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Subject</InputLabel>
              <Select
                value={filterSubject}
                label="Subject"
                onChange={(e) => setFilterSubject(e.target.value)}
              >
                <MenuItem value="all">All Subjects</MenuItem>
                {subjects.map((subject) => (
                  <MenuItem key={subject} value={subject}>
                    {subject}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Grade Filter */}
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Grade</InputLabel>
              <Select
                value={filterGrade}
                label="Grade"
                onChange={(e) => setFilterGrade(e.target.value)}
              >
                <MenuItem value="all">All Grades</MenuItem>
                {grades.map((grade) => (
                  <MenuItem key={grade} value={grade}>
                    Grade {grade}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Status Filter (NEW) */}
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={filterStatus}
                label="Status"
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <MenuItem value="all">All Statuses</MenuItem>
                <MenuItem value="present">Present</MenuItem>
                <MenuItem value="absent">Absent</MenuItem>
                <MenuItem value="late">Late</MenuItem>
                <MenuItem value="excused">Excused</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          {/* Date Filter */}
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              size="small"
              label="Date"
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          {/* Clear Button */}
          <Grid item xs={12} md={3}>
             <Button 
               variant="outlined" 
               fullWidth
               onClick={() => { 
                 setFilterSubject('all'); 
                 setFilterGrade('all'); 
                 setFilterStatus('all'); 
                 setFilterDate(''); 
               }}
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
                    <Chip 
                      label={record.class?.subject || 'N/A'} 
                      size="small" 
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    {record.class?.grade || record.student?.grade || 'N/A'}
                  </TableCell>
                  <TableCell>
                    {record.class?.scheduledDate 
                      ? format(new Date(record.class.scheduledDate), 'MMM dd, yyyy')
                      : 'N/A'}
                  </TableCell>
                  <TableCell>
                    {record.checkIn?.time ? (
                      <Chip 
                        label={format(new Date(record.checkIn.time), 'HH:mm')} 
                        size="small" 
                        color="success"
                        variant="outlined" 
                      />
                    ) : (
                      <Typography variant="caption" color="text.secondary">-</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={record.status} 
                      color={getAttendanceStatusColor(record.status)} 
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