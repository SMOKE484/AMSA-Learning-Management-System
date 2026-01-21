import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Grid, Card, CardContent, CircularProgress, Chip
} from '@mui/material';
import { Schedule as ScheduleIcon } from '@mui/icons-material';
import { format } from 'date-fns';
import api from '../../services/apiService';

const TutorTimetable = () => {
  const [timetable, setTimetable] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTimetable = async () => {
      try {
        const response = await api.get('/timetable/tutor');
        setTimetable(response.data.timetable || {});
      } catch (error) {
        console.error('Failed to fetch timetable:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchTimetable();
  }, []);

  if (loading) {
    return <CircularProgress />;
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, color: '#1e293b', mb: 4 }}>
        My Timetable
      </Typography>

      {Object.keys(timetable).length > 0 ? (
        <Grid container spacing={3}>
          {Object.entries(timetable).map(([date, classes]) => (
            <Grid item xs={12} md={6} key={date}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                    {format(new Date(date), 'EEEE, MMMM dd')}
                  </Typography>
                  {classes.map((classItem) => (
                    <Paper key={classItem._id} sx={{ p: 2, mb: 1, bgcolor: 'grey.50' }}>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {classItem.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {classItem.startTime} - {classItem.endTime} • {classItem.subject}
                      </Typography>
                      <Chip 
                        label={classItem.status} 
                        size="small" 
                        color="primary" 
                        sx={{ mt: 1 }}
                      />
                    </Paper>
                  ))}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <ScheduleIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No Classes Scheduled
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default TutorTimetable;