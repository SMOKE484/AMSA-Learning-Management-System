import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Grid, CircularProgress, Button } from '@mui/material';
import { 
  People as PeopleIcon, 
  School as SchoolIcon, 
  Schedule as ScheduleIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../../services/apiService';

const AdminDashboard = () => {
  const [stats, setStats] = useState({ 
    studentCount: 0, 
    tutorCount: 0,
    scheduleCount: 0,
    todayClasses: 0
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        // Fetch all stats in parallel
        const [studentRes, tutorRes, schedulesRes] = await Promise.all([
          api.get('/admin/students'),
          api.get('/admin/tutors'),
          api.get('/schedules')
        ]);
        
        const today = new Date().toISOString().split('T')[0];
        const todayClasses = schedulesRes.data.schedules?.filter(
          schedule => schedule.scheduledDate.split('T')[0] === today
        ).length || 0;

        setStats({
          studentCount: studentRes.data.students.length,
          tutorCount: tutorRes.data.tutors.length,
          scheduleCount: schedulesRes.data.schedules?.length || 0,
          todayClasses
        });
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return <CircularProgress />;
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ mb: 4, fontWeight: 700 }}>
        Admin Dashboard
      </Typography>
      
      <Grid container spacing={3}>
        {/* Existing Stats */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper sx={{ p: 3, display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                 onClick={() => navigate('/admin/students')}>
            <PeopleIcon sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
            <Box>
              <Typography variant="h3" sx={{ fontWeight: 700 }}>
                {stats.studentCount}
              </Typography>
              <Typography variant="h6" color="text.secondary">Total Students</Typography>
            </Box>
          </Paper>
        </Grid>
        
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper sx={{ p: 3, display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                 onClick={() => navigate('/admin/tutors')}>
            <SchoolIcon sx={{ fontSize: 40, mr: 2, color: 'secondary.main' }} />
            <Box>
              <Typography variant="h3" sx={{ fontWeight: 700 }}>
                {stats.tutorCount}
              </Typography>
              <Typography variant="h6" color="text.secondary">Total Tutors</Typography>
            </Box>
          </Paper>
        </Grid>

        {/* New Scheduling Stats */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper sx={{ p: 3, display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                 onClick={() => navigate('/admin/schedules')}>
            <ScheduleIcon sx={{ fontSize: 40, mr: 2, color: 'warning.main' }} />
            <Box>
              <Typography variant="h3" sx={{ fontWeight: 700 }}>
                {stats.scheduleCount}
              </Typography>
              <Typography variant="h6" color="text.secondary">Total Classes</Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper sx={{ p: 3, display: 'flex', alignItems: 'center' }}>
            <TrendingUpIcon sx={{ fontSize: 40, mr: 2, color: 'success.main' }} />
            <Box>
              <Typography variant="h3" sx={{ fontWeight: 700 }}>
                {stats.todayClasses}
              </Typography>
              <Typography variant="h6" color="text.secondary">Today's Classes</Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Quick Actions */}
      <Typography variant="h5" sx={{ mt: 6, mb: 3, fontWeight: 600 }}>
        Quick Actions
      </Typography>
      
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Button
            variant="outlined"
            fullWidth
            startIcon={<ScheduleIcon />}
            onClick={() => navigate('/admin/schedules')}
            sx={{ py: 2, justifyContent: 'flex-start' }}
          >
            Manage Schedules
          </Button>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Button
            variant="outlined"
            fullWidth
            startIcon={<TrendingUpIcon />}
            onClick={() => navigate('/admin/attendance')}
            sx={{ py: 2, justifyContent: 'flex-start' }}
          >
            View Attendance
          </Button>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Button
            variant="outlined"
            fullWidth
            startIcon={<SchoolIcon />}
            onClick={() => navigate('/admin/school-config')}
            sx={{ py: 2, justifyContent: 'flex-start' }}
          >
            School Settings
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AdminDashboard;