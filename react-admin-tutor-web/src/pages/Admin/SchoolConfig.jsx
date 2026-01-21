import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Grid, TextField, Button,
  CircularProgress, Switch, FormControlLabel, Alert,
  Card, CardContent, Divider
} from '@mui/material';
import { 
  LocationOn as LocationIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import api from '../../services/apiService';
import { useSnackbar } from '../../context/SnackbarContext';

const SchoolConfig = () => {
  const [config, setConfig] = useState({
    name: '',
    coordinates: { lat: '', lng: '' },
    allowedRadius: 200,
    geoFencingEnabled: true,
    address: {
      street: '',
      city: '',
      province: '',
      postalCode: '',
      country: 'South Africa'
    },
    defaultCheckInBuffer: 15,
    defaultCheckOutBuffer: 15,
    autoMarkAbsentEnabled: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const { showSnackbar } = useSnackbar();

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const response = await api.get('/school-config');
      setConfig(response.data.school);
    } catch (error) {
      console.error('Failed to fetch school config:', error);
      // Set defaults if config doesn't exist
      setConfig({
        ...config,
        coordinates: {
          lat: process.env.SCHOOL_LATITUDE || '-26.2041',
          lng: process.env.SCHOOL_LONGITUDE || '28.0473'
        }
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setConfig(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleAddressChange = (e) => {
    const { name, value } = e.target;
    setConfig(prev => ({
      ...prev,
      address: {
        ...prev.address,
        [name]: value
      }
    }));
  };

  const handleCoordinateChange = (e) => {
    const { name, value } = e.target;
    setConfig(prev => ({
      ...prev,
      coordinates: {
        ...prev.coordinates,
        [name]: parseFloat(value) || 0
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!config.coordinates.lat || !config.coordinates.lng) {
      showSnackbar('Please provide school coordinates.', 'error');
      return;
    }

    try {
      setSaving(true);
      // You'll need to create this endpoint in your backend
      await api.put('/admin/school-config', config);
      showSnackbar('School configuration updated successfully!', 'success');
    } catch (error) {
      showSnackbar(error.response?.data?.message || 'Failed to update configuration.', 'error');
    } finally {
      setSaving(false);
    }
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
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, color: '#1e293b', mb: 4 }}>
        School Configuration
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        Configure your school location and attendance settings. These settings affect geo-fencing for student check-ins.
      </Alert>

      <Box component="form" onSubmit={handleSubmit}>
        <Grid container spacing={4}>
          {/* School Information */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <SettingsIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  School Information
                </Typography>
              </Box>
              
              <TextField
                name="name"
                label="School Name"
                value={config.name}
                onChange={handleChange}
                fullWidth
                margin="normal"
              />
              
              <TextField
                name="street"
                label="Street Address"
                value={config.address.street}
                onChange={handleAddressChange}
                fullWidth
                margin="normal"
              />
              
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    name="city"
                    label="City"
                    value={config.address.city}
                    onChange={handleAddressChange}
                    fullWidth
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    name="province"
                    label="Province"
                    value={config.address.province}
                    onChange={handleAddressChange}
                    fullWidth
                    margin="normal"
                  />
                </Grid>
              </Grid>
              
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    name="postalCode"
                    label="Postal Code"
                    value={config.address.postalCode}
                    onChange={handleAddressChange}
                    fullWidth
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    name="country"
                    label="Country"
                    value={config.address.country}
                    onChange={handleAddressChange}
                    fullWidth
                    margin="normal"
                  />
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Location Settings */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <LocationIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Location Settings
                </Typography>
              </Box>

              <FormControlLabel
                control={
                  <Switch
                    checked={config.geoFencingEnabled}
                    onChange={handleChange}
                    name="geoFencingEnabled"
                  />
                }
                label="Enable Geo-fencing"
                sx={{ mb: 2 }}
              />

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    name="lat"
                    label="Latitude"
                    type="number"
                    value={config.coordinates.lat}
                    onChange={handleCoordinateChange}
                    fullWidth
                    margin="normal"
                    inputProps={{ step: "0.000001" }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    name="lng"
                    label="Longitude"
                    type="number"
                    value={config.coordinates.lng}
                    onChange={handleCoordinateChange}
                    fullWidth
                    margin="normal"
                    inputProps={{ step: "0.000001" }}
                  />
                </Grid>
              </Grid>

              <TextField
                name="allowedRadius"
                label="Allowed Radius (meters)"
                type="number"
                value={config.allowedRadius}
                onChange={handleChange}
                fullWidth
                margin="normal"
                helperText="Students must be within this radius to check in"
              />
            </Paper>
          </Grid>

          {/* Attendance Settings */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                Attendance Settings
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    name="defaultCheckInBuffer"
                    label="Check-in Buffer (minutes)"
                    type="number"
                    value={config.defaultCheckInBuffer}
                    onChange={handleChange}
                    fullWidth
                    helperText="Time before class start when check-in opens"
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    name="defaultCheckOutBuffer"
                    label="Check-out Buffer (minutes)"
                    type="number"
                    value={config.defaultCheckOutBuffer}
                    onChange={handleChange}
                    fullWidth
                    helperText="Time after class end when check-out closes"
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={config.autoMarkAbsentEnabled}
                        onChange={handleChange}
                        name="autoMarkAbsentEnabled"
                      />
                    }
                    label="Auto-mark absent students"
                    sx={{ mt: 2 }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    Automatically mark students as absent if they don't check in
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Current Location Card */}
          <Grid item xs={12}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  Current Configuration
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">
                      School Location
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {config.coordinates.lat}, {config.coordinates.lng}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">
                      Geo-fencing Radius
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {config.allowedRadius} meters
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={saving}
            sx={{ 
              px: 4,
              py: 1.5,
              fontWeight: 600,
              borderRadius: 2
            }}
          >
            {saving ? <CircularProgress size={24} /> : 'Save Configuration'}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default SchoolConfig;