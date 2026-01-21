import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, CircularProgress
} from '@mui/material';
import { People as PeopleIcon } from '@mui/icons-material';
import { format } from 'date-fns';
import api from '../../services/apiService';

const TutorAttendance = () => {
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        // This endpoint would need to be created to get tutor's class attendance
        const response = await api.get('/tutor/attendance');
        setAttendance(response.data.attendance || []);
      } catch (error) {
        console.error('Failed to fetch attendance:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAttendance();
  }, []);

  const getStatusColor = (status) => {
    const colors = {
      present: 'success',
      absent: 'error',
      late: 'warning',
      'left-early': 'warning'
    };
    return colors[status] || 'default';
  };

  if (loading) {
    return <CircularProgress />;
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, color: '#1e293b', mb: 4 }}>
        Class Attendance
      </Typography>

      {attendance.length > 0 ? (
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Student</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Class</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {attendance.map((record) => (
                <TableRow key={record._id}>
                  <TableCell>{record.student?.user?.name}</TableCell>
                  <TableCell>{record.class?.title}</TableCell>
                  <TableCell>{format(new Date(record.class?.scheduledDate), 'MMM dd, yyyy')}</TableCell>
                  <TableCell>
                    <Chip 
                      label={record.status}
                      color={getStatusColor(record.status)}
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
          <PeopleIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No Attendance Records
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default TutorAttendance;