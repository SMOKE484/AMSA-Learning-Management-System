import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, TextField, Button, Paper, Grid,
  FormControl, InputLabel, Select, MenuItem, CircularProgress,
  FormHelperText, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, IconButton, Dialog, DialogTitle,
  DialogContent, DialogContentText, DialogActions, Chip, Tooltip,
  Link
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import api from '../../services/apiService';
import { notesService } from '../../services/notesService';
import { useSnackbar } from '../../context/SnackbarContext';

const UploadNotes = () => {
  const [tutorProfile, setTutorProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const [file, setFile] = useState(null);
  const [formData, setFormData] = useState({ title: '', description: '', subject: '', grade: '' });
  const [uploading, setUploading] = useState(false);

  const [notes, setNotes] = useState([]);
  const [loadingNotes, setLoadingNotes] = useState(true);

  const [editDialog, setEditDialog] = useState({ open: false, noteId: null, title: '', description: '' });
  const [editSaving, setEditSaving] = useState(false);

  const [deleteDialog, setDeleteDialog] = useState({ open: false, noteId: null });
  const [deleting, setDeleting] = useState(false);

  const { showSnackbar } = useSnackbar();

  const fetchNotes = useCallback(async () => {
    try {
      setLoadingNotes(true);
      const data = await notesService.getMyNotes();
      setNotes(data.notes || []);
    } catch (err) {
      showSnackbar(typeof err === 'string' ? err : 'Failed to load notes.', 'error');
    } finally {
      setLoadingNotes(false);
    }
  }, [showSnackbar]);

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
    fetchNotes();
  }, [fetchNotes, showSnackbar]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

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
      await api.post('/tutors/notes/upload', data, { headers: { 'Content-Type': 'multipart/form-data' } });
      showSnackbar('Note uploaded successfully!', 'success');
      setFormData({ title: '', description: '', subject: '', grade: '' });
      setFile(null);
      fetchNotes();
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Failed to upload note.', 'error');
    } finally {
      setUploading(false);
    }
  };

  // --- Edit handlers ---
  const openEdit = (note) => {
    setEditDialog({ open: true, noteId: note._id, title: note.title, description: note.description || '' });
  };

  const handleEditSave = async () => {
    if (!editDialog.title.trim()) {
      showSnackbar('Title is required.', 'error');
      return;
    }
    setEditSaving(true);
    try {
      await notesService.updateNote(editDialog.noteId, { title: editDialog.title, description: editDialog.description });
      showSnackbar('Note updated successfully!', 'success');
      setEditDialog({ open: false, noteId: null, title: '', description: '' });
      fetchNotes();
    } catch (err) {
      showSnackbar(typeof err === 'string' ? err : 'Failed to update note.', 'error');
    } finally {
      setEditSaving(false);
    }
  };

  // --- Delete handlers ---
  const openDelete = (noteId) => setDeleteDialog({ open: true, noteId });

  const handleDeleteConfirm = async () => {
    setDeleting(true);
    try {
      await notesService.deleteNote(deleteDialog.noteId);
      showSnackbar('Note deleted successfully.', 'success');
      setDeleteDialog({ open: false, noteId: null });
      fetchNotes();
    } catch (err) {
      showSnackbar(typeof err === 'string' ? err : 'Failed to delete note.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (iso) =>
    new Date(iso).toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' });

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

      {/* Upload Form */}
      <Paper sx={{ p: 4, borderRadius: 3, boxShadow: '0 4px 6px rgba(0,0,0,0.05)', mb: 5 }}>
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
                  backgroundColor: file ? 'action.hover' : 'transparent',
                }}
                startIcon={<CloudUploadIcon />}
              >
                {file ? file.name : 'Click to select PDF file'}
                <input type="file" hidden accept="application/pdf" onChange={handleFileChange} />
              </Button>
              <FormHelperText sx={{ ml: 2, mt: 1 }}>Supported format: PDF only</FormHelperText>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel id="grade-select-label">Grade</InputLabel>
                <Select
                  labelId="grade-select-label"
                  name="grade"
                  value={formData.grade}
                  label="Grade"
                  onChange={handleChange}
                >
                  {tutorProfile?.grades.map((grade) => (
                    <MenuItem key={grade} value={grade}>Grade {grade}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel id="subject-select-label">Subject</InputLabel>
                <Select
                  labelId="subject-select-label"
                  name="subject"
                  value={formData.subject}
                  label="Subject"
                  onChange={handleChange}
                >
                  {tutorProfile?.subjects.map((subject) => (
                    <MenuItem key={subject} value={subject}>{subject}</MenuItem>
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
            sx={{ mt: 4, px: 4, py: 1.5, fontWeight: 600, borderRadius: 2 }}
          >
            {uploading ? 'Uploading...' : 'Upload Note'}
          </Button>
        </Box>
      </Paper>

      {/* Notes List */}
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 700, color: '#1e293b' }}>
        Your Uploaded Notes
      </Typography>

      <Paper sx={{ borderRadius: 3, boxShadow: '0 4px 6px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        {loadingNotes ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
            <CircularProgress />
          </Box>
        ) : notes.length === 0 ? (
          <Box sx={{ p: 5, textAlign: 'center' }}>
            <Typography color="text.secondary">You have not uploaded any notes yet.</Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f1f5f9' }}>
                  <TableCell sx={{ fontWeight: 700 }}>Title</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Subject</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Grade</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Uploaded</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="center">File</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {notes.map((note) => (
                  <TableRow key={note._id} hover>
                    <TableCell>
                      <Typography fontWeight={600}>{note.title}</Typography>
                      {note.description && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          {note.description}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip label={note.subject} size="small" color="primary" variant="outlined" />
                    </TableCell>
                    <TableCell>Grade {note.grade}</TableCell>
                    <TableCell>{formatDate(note.createdAt)}</TableCell>
                    <TableCell align="center">
                      <Tooltip title="View PDF">
                        <Link href={note.fileUrl} target="_blank" rel="noopener noreferrer" color="inherit">
                          <IconButton size="small" color="error">
                            <PictureAsPdfIcon />
                          </IconButton>
                        </Link>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => openEdit(note)} sx={{ mr: 1 }}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" color="error" onClick={() => openDelete(note._id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Edit Dialog */}
      <Dialog open={editDialog.open} onClose={() => setEditDialog({ ...editDialog, open: false })} fullWidth maxWidth="sm">
        <DialogTitle>Edit Note</DialogTitle>
        <DialogContent>
          <TextField
            label="Title"
            value={editDialog.title}
            onChange={(e) => setEditDialog({ ...editDialog, title: e.target.value })}
            fullWidth
            required
            sx={{ mt: 1, mb: 2 }}
          />
          <TextField
            label="Description (Optional)"
            value={editDialog.description}
            onChange={(e) => setEditDialog({ ...editDialog, description: e.target.value })}
            fullWidth
            multiline
            rows={3}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditDialog({ ...editDialog, open: false })} disabled={editSaving}>Cancel</Button>
          <Button variant="contained" onClick={handleEditSave} disabled={editSaving}>
            {editSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, noteId: null })}>
        <DialogTitle>Delete Note</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this note? This cannot be undone and the PDF file will be permanently removed.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteDialog({ open: false, noteId: null })} disabled={deleting}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDeleteConfirm} disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UploadNotes;
