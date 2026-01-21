import React, { useState, useEffect } from 'react';
import {
  Box, Typography, TextField, Button, Paper, Grid,
  FormControl, InputLabel, Select, MenuItem, CircularProgress,
  FormHelperText
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload'; // Make sure to import this
import api from '../../services/apiService';
import { useSnackbar } from '../../context/SnackbarContext';

const UploadNotes = () => {
  const [tutorProfile, setTutorProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Split state: 'file' for the binary, 'formData' for text fields
  const [file, setFile] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subject: '',
    grade: ''
  });
  
  const { showSnackbar } = useSnackbar();
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoadingProfile(true);
        const res = await api.get('/tutors/me');
        setTutorProfile(res.data.tutor);
      } catch (err) {
        showSnackbar('Failed to load tutor profile. Please refresh.', 'error');
      } finally {
        setLoadingProfile(false);
      }
    };
    fetchProfile();
  }, [showSnackbar]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Handle PDF selection
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type !== 'application/pdf') {
        showSnackbar('Only PDF files are allowed.', 'error');
        e.target.value = null; 
        setFile(null);
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title || !file || !formData.subject || !formData.grade) {
      showSnackbar('Please fill in all required fields and select a file.', 'error');
      return;
    }

    setUploading(true);

    try {
      const data = new FormData();
      data.append('file', file);
      data.append('title', formData.title);
      data.append('description', formData.description);
      data.append('subject', formData.subject);
      data.append('grade', formData.grade);

      await api.post('/tutors/notes/upload', data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      showSnackbar('Note uploaded successfully!', 'success');
      
      setFormData({
        title: '',
        description: '',
        subject: '',
        grade: ''
      });
      setFile(null);
      
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Failed to upload note.', 'error');
    } finally {
      setUploading(false);
    }
  };

  if (loadingProfile) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ mb: 4, fontWeight: 700, color: '#1e293b' }}>
        Upload Study Notes
      </Typography>
      <Paper 
        sx={{ 
          p: 4, 
          borderRadius: 3,
          boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
        }}
      >
        <Box component="form" onSubmit={handleSubmit} noValidate>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField 
                name="title" 
                label="Note Title" 
                value={formData.title} 
                onChange={handleChange} 
                fullWidth 
                required 
                variant="outlined"
              />
            </Grid>
            
            {/* === CUSTOM FILE INPUT (Modern Style) === */}
            <Grid item xs={12}>
              <Button
                variant="outlined"
                component="label"
                fullWidth
                sx={{ 
                  height: '56px', 
                  borderStyle: 'dashed', 
                  borderColor: file ? 'primary.main' : 'grey.400',
                  color: file ? 'primary.main' : 'text.secondary',
                  justifyContent: 'flex-start',
                  textTransform: 'none',
                  backgroundColor: file ? 'action.hover' : 'transparent'
                }}
                startIcon={<CloudUploadIcon />}
              >
                {file ? file.name : "Click to select PDF file"}
                <input
                  type="file"
                  hidden
                  accept="application/pdf"
                  onChange={handleFileChange}
                />
              </Button>
              <FormHelperText sx={{ ml: 2, mt: 1 }}>
                Supported format: PDF only
              </FormHelperText>
            </Grid>
            {/* ========================================= */}
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required sx={{ minWidth: 120 }}>
                <InputLabel id="grade-select-label">Grade</InputLabel>
                <Select
                  labelId="grade-select-label"
                  id="grade-select"
                  name="grade"
                  value={formData.grade}
                  label="Grade"
                  onChange={handleChange}
                >
                  {tutorProfile?.grades.map((grade) => (
                    <MenuItem key={grade} value={grade}>
                      Grade {grade}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required sx={{ minWidth: 120 }}>
                <InputLabel id="subject-select-label">Subject</InputLabel>
                <Select
                  labelId="subject-select-label"
                  id="subject-select"
                  name="subject"
                  value={formData.subject}
                  label="Subject"
                  onChange={handleChange}
                >
                  {tutorProfile?.subjects.map((subject) => (
                    <MenuItem key={subject} value={subject}>
                      {subject}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                name="description"
                label="Description (Optional)"
                value={formData.description}
                onChange={handleChange}
                fullWidth
                multiline
                rows={4}
                variant="outlined"
                helperText="Add any additional context or instructions for students"
              />
            </Grid>
          </Grid>
          
          <Button 
            type="submit" 
            variant="contained" 
            color="primary" 
            disabled={uploading}
            sx={{ 
              mt: 4,
              px: 4,
              py: 1.5,
              fontWeight: 600,
              borderRadius: 2
            }}
          >
            {uploading ? "Uploading..." : "Upload Note"}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default UploadNotes;