import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Grid, CircularProgress, Chip, Card, CardContent } from '@mui/material';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/apiService';

const TutorDashboard = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await api.get('/tutors/me');
      setProfile(res.data.tutor);
    } catch (error) {
      console.error("Failed to fetch tutor profile:", error);
    } finally {
      setLoading(false);
    }
  };
  fetchProfile();
}, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ mb: 4, fontWeight: 700, color: '#1e293b' }}>
        Welcome back, {user.name}!
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper 
            sx={{ 
              p: 4, 
              borderRadius: 3,
              boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
            }}
          >
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, color: '#1e293b', mb: 3 }}>
              Your Profile Details
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" sx={{ color: '#64748b', mb: 1 }}>
                  Email Address
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 500, color: '#1e293b' }}>
                  {user.email}
                </Typography>
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{ color: '#64748b', mb: 2 }}>
                  Assigned Grades
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {profile.grades.map(grade => (
                    <Chip 
                      key={grade} 
                      label={`Grade ${grade}`} 
                      color="primary" 
                      variant="filled"
                      sx={{ fontWeight: 600 }}
                    />
                  ))}
                </Box>
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{ color: '#64748b', mb: 2 }}>
                  Assigned Subjects
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {profile.subjects.map(subject => (
                    <Chip 
                      key={subject} 
                      label={subject} 
                      color="secondary" 
                      variant="outlined"
                      sx={{ fontWeight: 500 }}
                    />
                  ))}
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card 
            sx={{ 
              borderRadius: 3,
              background: 'linear-gradient(135deg, #E23724 0%, #FF6F5E 100%)',
              color: 'white',
              height: '100%'
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Quick Stats
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9, mb: 2 }}>
                Your teaching overview
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {profile.grades.length}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Grades Assigned
                </Typography>
              </Box>
              <Box sx={{ mt: 3 }}>
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {profile.subjects.length}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Subjects Assigned
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default TutorDashboard;