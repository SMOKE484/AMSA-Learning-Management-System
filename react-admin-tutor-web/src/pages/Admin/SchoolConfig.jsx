import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Typography, Paper, Grid, TextField, Button,
  CircularProgress, Switch, FormControlLabel, Alert,
  Card, CardContent, Chip, Stack, List, ListItemButton,
  ListItemText, InputAdornment, IconButton, Tooltip
} from '@mui/material';
import {
  LocationOn as LocationIcon,
  Settings as SettingsIcon,
  Delete as DeleteIcon,
  Wifi as WifiIcon,
  Add as AddIcon,
  Undo as UndoIcon,
  MyLocation as MyLocationIcon,
  CheckCircle as CheckCircleIcon,
  Draw as DrawIcon,
  Search as SearchIcon,
  SatelliteAlt as SatelliteAltIcon,
  Map as MapIcon,
} from '@mui/icons-material';
import {
  MapContainer, TileLayer, Polygon, CircleMarker,
  useMapEvents, useMap, Polyline
} from 'react-leaflet';
import api from '../../services/apiService';
import { useSnackbar } from '../../context/SnackbarContext';

const DEFAULT_CENTER = [-26.2041, 28.0473];
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

function MapClickHandler({ drawing, onMapClick }) {
  useMapEvents({
    click(e) {
      if (drawing) onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

function FlyToController({ target }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo([target.lat, target.lng], 18, { duration: 1.2 });
  }, [target, map]);
  return null;
}

const GeofenceMap = ({ polygon, onPolygonChange, initialCenter }) => {
  const [drawing, setDrawing] = useState(false);
  const [satelliteView, setSatelliteView] = useState(false);
  const [flyTarget, setFlyTarget] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef(null);

  const handleMapClick = useCallback((point) => {
    onPolygonChange(prev => [...prev, point]);
  }, [onPolygonChange]);

  const handleUndo = () => onPolygonChange(prev => prev.slice(0, -1));

  const handleClear = () => {
    onPolygonChange([]);
    setDrawing(false);
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) {
      setSearchResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(value)}.json?access_token=${MAPBOX_TOKEN}&limit=5`
        );
        const data = await res.json();
        setSearchResults(data.features || []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
  };

  const handleResultClick = (result) => {
    setFlyTarget({ lat: result.center[1], lng: result.center[0] });
    setSearchQuery(result.place_name.split(',').slice(0, 2).join(','));
    setSearchResults([]);
  };

  const positions = polygon.map(p => [p.lat, p.lng]);

  return (
    <Box>
      {/* Search box */}
      <Box sx={{ position: 'relative', mb: 1.5 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search for a place…"
          value={searchQuery}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                {searching
                  ? <CircularProgress size={16} />
                  : <SearchIcon fontSize="small" color="action" />}
              </InputAdornment>
            ),
          }}
        />
        {searchResults.length > 0 && (
          <Paper
            elevation={4}
            sx={{
              position: 'absolute', top: '100%', left: 0, right: 0,
              zIndex: 1200, maxHeight: 220, overflowY: 'auto'
            }}
          >
            <List dense disablePadding>
              {searchResults.map((r) => (
                <ListItemButton key={r.id} onClick={() => handleResultClick(r)} divider>
                  <ListItemText
                    primary={r.place_name.split(',')[0]}
                    secondary={r.place_name.split(',').slice(1, 3).join(',')}
                    primaryTypographyProps={{ noWrap: true }}
                    secondaryTypographyProps={{ noWrap: true }}
                  />
                </ListItemButton>
              ))}
            </List>
          </Paper>
        )}
        {!searching && searchQuery.trim() && searchResults.length === 0 && (
          <Paper elevation={2} sx={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1200 }}>
            <List dense disablePadding>
              <ListItemButton disabled>
                <ListItemText secondary="No places found" />
              </ListItemButton>
            </List>
          </Paper>
        )}
      </Box>

      {/* Draw controls */}
      <Stack direction="row" spacing={1} sx={{ mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
        <Button
          variant={drawing ? 'contained' : 'outlined'}
          color={drawing ? 'error' : 'primary'}
          startIcon={<DrawIcon />}
          onClick={() => setDrawing(d => !d)}
          size="small"
        >
          {drawing ? 'Stop Drawing' : 'Draw Boundary'}
        </Button>
        <Button
          variant="outlined"
          startIcon={<UndoIcon />}
          onClick={handleUndo}
          disabled={polygon.length === 0}
          size="small"
        >
          Undo Point
        </Button>
        <Button
          variant="outlined"
          color="error"
          startIcon={<DeleteIcon />}
          onClick={handleClear}
          disabled={polygon.length === 0}
          size="small"
        >
          Clear Boundary
        </Button>
        {polygon.length >= 3 && (
          <Chip icon={<CheckCircleIcon />} label={`${polygon.length} points — boundary ready`} color="success" size="small" />
        )}
        {polygon.length > 0 && polygon.length < 3 && (
          <Chip label={`${polygon.length} point${polygon.length > 1 ? 's' : ''} — need at least 3`} color="warning" size="small" />
        )}
      </Stack>

      {drawing && (
        <Alert severity="info" sx={{ mb: 1, py: 0.5 }}>
          Click on the map to add boundary points. Add at least 3 points to define the school premises.
        </Alert>
      )}

      {/* Map */}
      <Box
        sx={{
          height: 420,
          borderRadius: 2,
          overflow: 'hidden',
          border: drawing ? '2px solid #1976d2' : '1px solid #e0e0e0',
          cursor: drawing ? 'crosshair' : 'default',
          position: 'relative',
        }}
      >
        {/* Satellite/Street toggle */}
        <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1001 }}>
          <Tooltip title={satelliteView ? 'Switch to street view' : 'Switch to satellite view'}>
            <IconButton
              size="small"
              onClick={() => setSatelliteView(v => !v)}
              sx={{ bgcolor: 'white', boxShadow: 2, '&:hover': { bgcolor: '#f5f5f5' } }}
            >
              {satelliteView
                ? <MapIcon fontSize="small" />
                : <SatelliteAltIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Box>

        <MapContainer
          center={initialCenter}
          zoom={17}
          style={{ height: '100%', width: '100%' }}
          doubleClickZoom={false}
        >
          {satelliteView ? (
            <TileLayer
              url={`https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/256/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`}
              attribution="© <a href='https://www.mapbox.com/about/maps/'>Mapbox</a> © <a href='http://www.openstreetmap.org/copyright'>OpenStreetMap</a>"
              tileSize={512}
              zoomOffset={-1}
            />
          ) : (
            <TileLayer
              url={`https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/256/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`}
              attribution="© <a href='https://www.mapbox.com/about/maps/'>Mapbox</a> © <a href='http://www.openstreetmap.org/copyright'>OpenStreetMap</a>"
              tileSize={512}
              zoomOffset={-1}
            />
          )}

          <MapClickHandler drawing={drawing} onMapClick={handleMapClick} />
          <FlyToController target={flyTarget} />

          {positions.length >= 3 && (
            <Polygon
              positions={positions}
              pathOptions={{ color: '#E23724', fillColor: '#E23724', fillOpacity: 0.15, weight: 2 }}
            />
          )}
          {positions.length >= 2 && positions.length < 3 && (
            <Polyline positions={positions} pathOptions={{ color: '#E23724', dashArray: '6 4', weight: 2 }} />
          )}
          {positions.map((pos, i) => (
            <CircleMarker
              key={i}
              center={pos}
              radius={5}
              pathOptions={{ color: '#E23724', fillColor: '#fff', fillOpacity: 1, weight: 2 }}
            />
          ))}
        </MapContainer>
      </Box>
    </Box>
  );
};

const getGeolocation = () =>
  new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve([pos.coords.latitude, pos.coords.longitude]),
      () => resolve(null),
      { timeout: 5000 }
    );
  });

const SchoolConfig = () => {
  const [config, setConfig] = useState({
    name: '',
    coordinates: { lat: DEFAULT_CENTER[0], lng: DEFAULT_CENTER[1] },
    allowedRadius: 200,
    geoFencingEnabled: true,
    requireLocationAccuracy: true,
    maxLocationAccuracy: 100,
    geofencePolygon: [],
    address: { street: '', city: '', province: '', postalCode: '', country: 'South Africa' },
    defaultCheckInBuffer: 15,
    defaultCheckOutBuffer: 15,
    autoMarkAbsentEnabled: true,
    allowedIPs: []
  });
  const [newIp, setNewIp] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [initialMapCenter, setInitialMapCenter] = useState(null);

  const { showSnackbar } = useSnackbar();

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      // Fetch config and geolocation in parallel
      const [response, geoCoords] = await Promise.all([
        api.get('/school-config'),
        getGeolocation()
      ]);
      const school = response.data.school;
      setConfig(prev => ({
        ...prev,
        ...school,
        address: school.address && typeof school.address === 'object' ? school.address : prev.address,
        geofencePolygon: school.geofencePolygon || [],
        coordinates: school.coordinates || prev.coordinates,
        allowedIPs: school.allowedIPs || [],
      }));
      // Use geolocation if available; otherwise use saved school coordinates
      setInitialMapCenter(
        geoCoords || [
          Number(school.coordinates?.lat) || DEFAULT_CENTER[0],
          Number(school.coordinates?.lng) || DEFAULT_CENTER[1]
        ]
      );
    } catch (error) {
      console.error('Failed to fetch school config:', error);
      // On total failure, still try to get geolocation
      const geoCoords = await getGeolocation();
      setInitialMapCenter(geoCoords || DEFAULT_CENTER);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setConfig(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleAddressChange = (e) => {
    const { name, value } = e.target;
    setConfig(prev => ({ ...prev, address: { ...prev.address, [name]: value } }));
  };

  const handlePolygonChange = (updater) => {
    setConfig(prev => ({
      ...prev,
      geofencePolygon: typeof updater === 'function' ? updater(prev.geofencePolygon) : updater
    }));
  };

  const handleAddIp = () => {
    const ip = newIp.trim();
    if (!ip) return;
    if (!/^\d{1,3}(\.\d{1,3}){3}(\/\d{1,2})?$/.test(ip)) {
      showSnackbar('Enter a valid IP address (e.g. 192.168.1.101)', 'error');
      return;
    }
    if (config.allowedIPs.includes(ip)) {
      showSnackbar('This IP is already in the list.', 'warning');
      return;
    }
    setConfig(prev => ({ ...prev, allowedIPs: [...prev.allowedIPs, ip] }));
    setNewIp('');
  };

  const handleRemoveIp = (ip) => {
    setConfig(prev => ({ ...prev, allowedIPs: prev.allowedIPs.filter(x => x !== ip) }));
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      showSnackbar('Geolocation is not supported by this browser.', 'error');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setConfig(prev => ({
          ...prev,
          coordinates: { lat: pos.coords.latitude, lng: pos.coords.longitude }
        }));
        showSnackbar('Map centered on your current location.', 'success');
      },
      () => showSnackbar('Could not get your location.', 'error')
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!config.coordinates.lat || !config.coordinates.lng) {
      showSnackbar('Please provide school coordinates.', 'error');
      return;
    }
    if (config.geoFencingEnabled && config.geofencePolygon.length > 0 && config.geofencePolygon.length < 3) {
      showSnackbar('Polygon boundary needs at least 3 points, or clear it to use radius instead.', 'error');
      return;
    }
    try {
      setSaving(true);
      await api.put('/admin/school-config', config);
      showSnackbar('School configuration updated successfully!', 'success');
    } catch (error) {
      showSnackbar(error.response?.data?.message || 'Failed to update configuration.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !initialMapCenter) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: 2 }}>
        <CircularProgress />
        <Typography variant="body2" color="text.secondary">
          {loading ? 'Loading configuration…' : 'Locating you…'}
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, color: '#1e293b', mb: 4 }}>
        School Configuration
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        Configure your school location and attendance settings. Draw the exact school boundary on the map
        so students can only check in when physically inside the premises.
      </Alert>

      <Box component="form" onSubmit={handleSubmit}>
        <Grid container spacing={4}>
          {/* School Information */}
          <Grid size={{ xs: 12, md: 5 }}>
            <Paper sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <SettingsIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>School Information</Typography>
              </Box>
              <TextField name="name" label="School Name" value={config.name} onChange={handleChange} fullWidth margin="normal" />
              <TextField name="street" label="Street Address" value={config.address.street || ''} onChange={handleAddressChange} fullWidth margin="normal" />
              <Grid container spacing={2} sx={{ mt: 0 }}>
                <Grid size={{ xs: 6 }}>
                  <TextField name="city" label="City" value={config.address.city || ''} onChange={handleAddressChange} fullWidth margin="normal" />
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <TextField name="province" label="Province" value={config.address.province || ''} onChange={handleAddressChange} fullWidth margin="normal" />
                </Grid>
              </Grid>
              <Grid container spacing={2}>
                <Grid size={{ xs: 6 }}>
                  <TextField name="postalCode" label="Postal Code" value={config.address.postalCode || ''} onChange={handleAddressChange} fullWidth margin="normal" />
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <TextField name="country" label="Country" value={config.address.country || ''} onChange={handleAddressChange} fullWidth margin="normal" />
                </Grid>
              </Grid>
            </Paper>

            {/* Attendance Settings */}
            <Paper sx={{ p: 3, mt: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Attendance Settings</Typography>
              <TextField
                name="defaultCheckInBuffer"
                label="Check-in Buffer (minutes)"
                type="number"
                value={config.defaultCheckInBuffer}
                onChange={handleChange}
                fullWidth margin="normal"
                helperText="Time before class start when check-in opens"
              />
              <TextField
                name="defaultCheckOutBuffer"
                label="Check-out Buffer (minutes)"
                type="number"
                value={config.defaultCheckOutBuffer}
                onChange={handleChange}
                fullWidth margin="normal"
                helperText="Time after class end when check-out closes"
              />
              <FormControlLabel
                control={<Switch checked={config.autoMarkAbsentEnabled} onChange={handleChange} name="autoMarkAbsentEnabled" />}
                label="Auto-mark absent students"
                sx={{ mt: 1 }}
              />
            </Paper>

            {/* Allowed WiFi IPs */}
            <Paper sx={{ p: 3, mt: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <WifiIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>Allowed WiFi IPs</Typography>
              </Box>
              <Alert severity="info" sx={{ mb: 2, py: 0.5 }}>
                Students can only sign the register from these IPs. Leave empty to disable this check.
              </Alert>
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <TextField
                  size="small"
                  placeholder="e.g. 192.168.1.101"
                  value={newIp}
                  onChange={e => setNewIp(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddIp())}
                  fullWidth
                />
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={handleAddIp}
                  sx={{ whiteSpace: 'nowrap', flexShrink: 0 }}
                >
                  Add IP
                </Button>
              </Box>
              {config.allowedIPs.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                  No IPs configured — WiFi check disabled.
                </Typography>
              ) : (
                <Stack spacing={1}>
                  {config.allowedIPs.map(ip => (
                    <Box key={ip} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1.5, py: 0.75, bgcolor: 'action.hover', borderRadius: 1 }}>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 500 }}>{ip}</Typography>
                      <IconButton size="small" onClick={() => handleRemoveIp(ip)} color="error">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}
                </Stack>
              )}
            </Paper>
          </Grid>

          {/* Location & Map */}
          <Grid size={{ xs: 12, md: 7 }}>
            <Paper sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <LocationIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>Geofence Boundary</Typography>
                </Box>
                <FormControlLabel
                  control={<Switch checked={config.geoFencingEnabled} onChange={handleChange} name="geoFencingEnabled" />}
                  label="Enable"
                />
              </Box>

              <Alert severity={config.geofencePolygon.length >= 3 ? 'success' : 'warning'} sx={{ mb: 2, py: 0.5 }}>
                {config.geofencePolygon.length >= 3
                  ? `Polygon boundary active — ${config.geofencePolygon.length} points define the school premises.`
                  : 'No polygon drawn. Draw the school boundary below, or the system will fall back to the radius circle.'}
              </Alert>

              <GeofenceMap
                polygon={config.geofencePolygon}
                onPolygonChange={handlePolygonChange}
                initialCenter={initialMapCenter}
              />

              {/* Fallback radius */}
              <Box sx={{ mt: 2.5 }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  Fallback radius (used when no polygon is drawn)
                </Typography>
                <Grid container spacing={2} alignItems="center">
                  <Grid size={{ xs: 12, sm: 5 }}>
                    <TextField
                      name="allowedRadius"
                      label="Radius (meters)"
                      type="number"
                      value={config.allowedRadius}
                      onChange={handleChange}
                      fullWidth
                      size="small"
                      helperText="50–1000 m"
                      inputProps={{ min: 50, max: 1000 }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 7 }}>
                    <Button variant="outlined" size="small" startIcon={<MyLocationIcon />} onClick={handleUseMyLocation}>
                      Use My Location as Center
                    </Button>
                  </Grid>
                </Grid>
              </Box>
            </Paper>

            {/* Summary card */}
            <Card variant="outlined" sx={{ mt: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>Current Configuration</Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="body2" color="text.secondary">Geofencing</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>{config.geoFencingEnabled ? 'Enabled' : 'Disabled'}</Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="body2" color="text.secondary">Boundary type</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {config.geofencePolygon.length >= 3 ? `Polygon (${config.geofencePolygon.length} pts)` : `Radius circle (${config.allowedRadius} m)`}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="body2" color="text.secondary">Map center</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {Number(config.coordinates.lat).toFixed(6)}, {Number(config.coordinates.lng).toFixed(6)}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
          <Button type="submit" variant="contained" size="large" disabled={saving} sx={{ px: 4, py: 1.5, fontWeight: 600, borderRadius: 2 }}>
            {saving ? <CircularProgress size={24} /> : 'Save Configuration'}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default SchoolConfig;
