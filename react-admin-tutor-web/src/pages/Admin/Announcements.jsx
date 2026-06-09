import React, { useState, useEffect } from 'react';
import {
  Box, Typography, TextField, Button, Paper, CircularProgress,
  FormControl, InputLabel, Select, MenuItem, Divider, Chip, List,
  ListItem, ListItemText, ListItemIcon
} from '@mui/material';
import CampaignIcon from '@mui/icons-material/Campaign';
import SendIcon from '@mui/icons-material/Send';
import api from '../../services/apiService';
import { academicService } from '../../services/academicService';
import { useSnackbar } from '../../context/SnackbarContext';

const Announcements = () => {
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    target: 'both',
    priority: 'normal',
  });
  const [selectedGrades, setSelectedGrades] = useState([]); // [] = all grades
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState([]);
  const { showSnackbar } = useSnackbar();

  useEffect(() => {
    academicService.getGrades()
      .then(g => setGrades(g))
      .catch(() => setGrades([8, 9, 10, 11, 12]));
  }, []);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const toggleGrade = (grade) => {
    setSelectedGrades(prev =>
      prev.includes(grade) ? prev.filter(g => g !== grade) : [...prev, grade]
    );
  };

  const handleSend = async () => {
    if (!formData.title.trim() || !formData.message.trim()) {
      showSnackbar('Title and message are required.', 'warning');
      return;
    }
    try {
      setLoading(true);
      const payload = {
        ...formData,
        ...(selectedGrades.length > 0 && { grades: selectedGrades.map(String) }),
      };
      const res = await api.post('/notifications/announcement', payload);
      showSnackbar(`${res.data.message}`, 'success');
      setSent(prev => [
        {
          title: formData.title,
          message: formData.message,
          target: formData.target,
          priority: formData.priority,
          grades: selectedGrades,
          sentAt: new Date().toISOString(),
          count: res.data.notificationsSent,
        },
        ...prev,
      ]);
      setFormData({ title: '', message: '', target: 'both', priority: 'normal' });
      setSelectedGrades([]);
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Failed to send announcement.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const targetLabel = { students: 'Students', parents: 'Parents', both: 'Students & Parents' };
  const priorityColor = { low: 'default', normal: 'primary', high: 'error' };

  return (
    <Box sx={{ p: 3, maxWidth: 800 }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Announcements
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Send a school-wide announcement. Recipients will receive an in-app notification and a push notification.
      </Typography>

      {/* ── Compose Form ── */}
      <Paper sx={{ p: 3, mb: 4, borderRadius: 3 }}>
        <Typography variant="h6" fontWeight={600} mb={2}>
          Compose Announcement
        </Typography>

        <TextField
          label="Title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          fullWidth
          required
          sx={{ mb: 2 }}
          inputProps={{ maxLength: 100 }}
          helperText={`${formData.title.length}/100`}
        />

        <TextField
          label="Message"
          name="message"
          value={formData.message}
          onChange={handleChange}
          fullWidth
          required
          multiline
          rows={4}
          sx={{ mb: 2 }}
          inputProps={{ maxLength: 500 }}
          helperText={`${formData.message.length}/500`}
        />

        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Send To</InputLabel>
            <Select name="target" value={formData.target} label="Send To" onChange={handleChange}>
              <MenuItem value="students">Students Only</MenuItem>
              <MenuItem value="parents">Parents Only</MenuItem>
              <MenuItem value="both">Students &amp; Parents</MenuItem>
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 160 }}>
            <InputLabel>Priority</InputLabel>
            <Select name="priority" value={formData.priority} label="Priority" onChange={handleChange}>
              <MenuItem value="low">Low</MenuItem>
              <MenuItem value="normal">Normal</MenuItem>
              <MenuItem value="high">High</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* ── Grade Filter ── */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" fontWeight={600} color="text.secondary" mb={1}>
            Grades
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            <Chip
              label="All Grades"
              onClick={() => setSelectedGrades([])}
              color={selectedGrades.length === 0 ? 'primary' : 'default'}
              variant={selectedGrades.length === 0 ? 'filled' : 'outlined'}
              sx={{ fontWeight: 600 }}
            />
            {grades.map(g => (
              <Chip
                key={g}
                label={`Grade ${g}`}
                onClick={() => toggleGrade(g)}
                color={selectedGrades.includes(g) ? 'primary' : 'default'}
                variant={selectedGrades.includes(g) ? 'filled' : 'outlined'}
              />
            ))}
          </Box>
          {selectedGrades.length > 0 && (
            <Typography variant="caption" color="text.disabled" mt={0.5} display="block">
              Sending to Grade {selectedGrades.sort((a, b) => a - b).join(', ')} only
            </Typography>
          )}
        </Box>

        <Button
          variant="contained"
          size="large"
          startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <SendIcon />}
          onClick={handleSend}
          disabled={loading}
          sx={{ borderRadius: 2, px: 4 }}
        >
          {loading ? 'Sending…' : 'Send Announcement'}
        </Button>
      </Paper>

      {/* ── Sent History ── */}
      {sent.length > 0 && (
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="h6" fontWeight={600} mb={2}>
            Sent This Session
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <List disablePadding>
            {sent.map((item, idx) => (
              <ListItem key={idx} alignItems="flex-start" disablePadding sx={{ mb: 2 }}>
                <ListItemIcon sx={{ mt: 0.5, minWidth: 40 }}>
                  <CampaignIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Typography fontWeight={600}>{item.title}</Typography>
                      <Chip label={targetLabel[item.target]} size="small" variant="outlined" />
                      <Chip label={item.priority} size="small" color={priorityColor[item.priority]} />
                      {item.grades.length > 0
                        ? <Chip label={`Gr ${item.grades.sort((a,b) => a-b).join(', ')}`} size="small" color="secondary" variant="outlined" />
                        : <Chip label="All grades" size="small" variant="outlined" />
                      }
                      <Chip label={`${item.count} sent`} size="small" color="success" variant="outlined" />
                    </Box>
                  }
                  secondary={
                    <>
                      <Typography variant="body2" color="text.secondary" mt={0.5}>
                        {item.message}
                      </Typography>
                      <Typography variant="caption" color="text.disabled">
                        {new Date(item.sentAt).toLocaleString()}
                      </Typography>
                    </>
                  }
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}
    </Box>
  );
};

export default Announcements;
