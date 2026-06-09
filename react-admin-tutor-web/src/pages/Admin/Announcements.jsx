import React, { useState } from 'react';
import {
  Box, Typography, TextField, Button, Paper, CircularProgress,
  FormControl, InputLabel, Select, MenuItem, Divider, Chip, List,
  ListItem, ListItemText, ListItemIcon
} from '@mui/material';
import CampaignIcon from '@mui/icons-material/Campaign';
import SendIcon from '@mui/icons-material/Send';
import api from '../../services/apiService';
import { useSnackbar } from '../../context/SnackbarContext';

const Announcements = () => {
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    target: 'both',
    priority: 'normal',
  });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState([]);
  const { showSnackbar } = useSnackbar();

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSend = async () => {
    if (!formData.title.trim() || !formData.message.trim()) {
      showSnackbar('Title and message are required.', 'warning');
      return;
    }
    try {
      setLoading(true);
      const res = await api.post('/notifications/announcement', formData);
      showSnackbar(`${res.data.message}`, 'success');
      setSent(prev => [
        {
          title: formData.title,
          message: formData.message,
          target: formData.target,
          priority: formData.priority,
          sentAt: new Date().toISOString(),
          count: res.data.notificationsSent,
        },
        ...prev,
      ]);
      setFormData({ title: '', message: '', target: 'both', priority: 'normal' });
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
