import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Button, TextField, CircularProgress, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Tooltip
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import api from '../../services/apiService';
import { useSnackbar } from '../../context/SnackbarContext';

const ManageSubjects = () => {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [adding, setAdding] = useState(false);

  const [editDialog, setEditDialog] = useState({ open: false, subject: null, name: '' });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, subject: null });

  const { showSnackbar } = useSnackbar();

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/subjects');
      setSubjects(res.data.subjects || []);
    } catch {
      showSnackbar('Failed to load subjects.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  const handleAdd = async () => {
    const name = newSubjectName.trim();
    if (!name) return;
    try {
      setAdding(true);
      await api.post('/admin/subjects', { name });
      setNewSubjectName('');
      showSnackbar(`"${name}" added successfully.`, 'success');
      fetchSubjects();
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Failed to add subject.', 'error');
    } finally {
      setAdding(false);
    }
  };

  const handleEditSave = async () => {
    const name = editDialog.name.trim();
    if (!name) return;
    try {
      await api.put(`/admin/subjects/${editDialog.subject._id}`, { name });
      showSnackbar('Subject updated.', 'success');
      setEditDialog({ open: false, subject: null, name: '' });
      fetchSubjects();
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Failed to update subject.', 'error');
    }
  };

  const handleToggleActive = async (subject) => {
    try {
      await api.put(`/admin/subjects/${subject._id}`, { isActive: !subject.isActive });
      showSnackbar(`Subject ${subject.isActive ? 'deactivated' : 'activated'}.`, 'success');
      fetchSubjects();
    } catch {
      showSnackbar('Failed to update subject.', 'error');
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/admin/subjects/${deleteDialog.subject._id}`);
      showSnackbar(`"${deleteDialog.subject.name}" deleted.`, 'success');
      setDeleteDialog({ open: false, subject: null });
      fetchSubjects();
    } catch {
      showSnackbar('Failed to delete subject.', 'error');
    }
  };

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
        Manage Subjects
      </Typography>

      {/* Add Subject */}
      <Paper sx={{ p: 3, mb: 4, borderRadius: 3, boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: '#1e293b' }}>
          Add New Subject
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mt: 1 }}>
          <TextField
            label="Subject Name"
            value={newSubjectName}
            onChange={(e) => setNewSubjectName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            size="small"
            sx={{ flex: 1, maxWidth: 400 }}
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAdd}
            disabled={adding || !newSubjectName.trim()}
            sx={{ fontWeight: 600 }}
          >
            {adding ? 'Adding...' : 'Add Subject'}
          </Button>
        </Box>
      </Paper>

      {/* Subjects Table */}
      <Paper sx={{ borderRadius: 3, boxShadow: '0 4px 6px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, backgroundColor: '#f8fafc' }}>Subject Name</TableCell>
                <TableCell sx={{ fontWeight: 600, backgroundColor: '#f8fafc' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600, backgroundColor: '#f8fafc' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {subjects.map((subject) => (
                <TableRow
                  key={subject._id}
                  sx={{ '&:hover': { backgroundColor: '#f8fafc' } }}
                >
                  <TableCell>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {subject.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={subject.isActive ? 'Active' : 'Inactive'}
                      color={subject.isActive ? 'success' : 'default'}
                      size="small"
                      onClick={() => handleToggleActive(subject)}
                      sx={{ cursor: 'pointer' }}
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title="Rename">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => setEditDialog({ open: true, subject, name: subject.name })}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => setDeleteDialog({ open: true, subject })}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        {subjects.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Typography variant="h6" sx={{ color: '#64748b' }}>No subjects found</Typography>
            <Typography variant="body2" sx={{ color: '#94a3b8' }}>Add a subject above to get started.</Typography>
          </Box>
        )}
      </Paper>

      {/* Edit Dialog */}
      <Dialog open={editDialog.open} onClose={() => setEditDialog({ open: false, subject: null, name: '' })} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>Rename Subject</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Subject Name"
            value={editDialog.name}
            onChange={(e) => setEditDialog(d => ({ ...d, name: e.target.value }))}
            onKeyDown={(e) => e.key === 'Enter' && handleEditSave()}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditDialog({ open: false, subject: null, name: '' })}>Cancel</Button>
          <Button variant="contained" onClick={handleEditSave} disabled={!editDialog.name.trim()}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, subject: null })} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>Delete Subject</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete <strong>"{deleteDialog.subject?.name}"</strong>?
            Existing records using this subject will not be affected.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteDialog({ open: false, subject: null })}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ManageSubjects;
