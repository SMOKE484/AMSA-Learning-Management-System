import React, { useState, useEffect } from 'react';
import {
  Box, Typography, TextField, Button, Paper, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, CircularProgress,
  Grid, IconButton, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { format } from 'date-fns';
import api from '../../services/apiService';
import { useSnackbar } from '../../context/SnackbarContext';
import { useAuth } from '../../hooks/useAuth';

const ManageAdmins = () => {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);

  const [formData, setFormData] = useState({ name: '', email: '', password: '' });

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [editFormData, setEditFormData] = useState({ name: '', email: '' });

  const { showSnackbar } = useSnackbar();
  const { user } = useAuth();

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/admins');
      setAdmins(res.data.admins || []);
    } catch (err) {
      showSnackbar('Failed to fetch admins.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password) {
      showSnackbar('All fields are required.', 'error');
      return;
    }
    try {
      setFormLoading(true);
      await api.post('/admin/admins', formData);
      showSnackbar('Admin created successfully!', 'success');
      setFormData({ name: '', email: '', password: '' });
      await fetchAdmins();
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Failed to create admin.', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (adminId) => {
    if (user?._id === adminId || user?.id === adminId) {
      showSnackbar('You cannot delete your own account.', 'error');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this admin? This cannot be undone.')) return;
    try {
      await api.delete(`/admin/users/${adminId}`);
      showSnackbar('Admin deleted successfully', 'success');
      await fetchAdmins();
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Failed to delete admin.', 'error');
    }
  };

  const openEditDialog = (admin) => {
    setSelectedAdmin(admin);
    setEditFormData({ name: admin.name, email: admin.email });
    setEditDialogOpen(true);
  };

  const closeEditDialog = () => {
    setEditDialogOpen(false);
    setSelectedAdmin(null);
  };

  const handleEditChange = (e) => setEditFormData({ ...editFormData, [e.target.name]: e.target.value });

  const handleEditSubmit = async () => {
    if (!editFormData.name || !editFormData.email) {
      showSnackbar('Name and email are required.', 'error');
      return;
    }
    try {
      setEditLoading(true);
      await api.put(`/admin/admins/${selectedAdmin._id}`, {
        name: editFormData.name.trim(),
        email: editFormData.email.trim()
      });
      showSnackbar('Admin updated successfully!', 'success');
      closeEditDialog();
      await fetchAdmins();
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Failed to update admin.', 'error');
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ mb: 4, fontWeight: 700, color: '#1e293b' }}>
        Manage Admins
      </Typography>

      {/* Create Admin Form */}
      <Paper sx={{ p: 4, mb: 4, borderRadius: 3, boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
        <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, color: '#1e293b', mb: 3 }}>
          Add New Admin
        </Typography>
        <Box component="form" onSubmit={handleSubmit} noValidate>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={4}>
              <TextField
                name="name"
                label="Full Name"
                value={formData.name}
                onChange={handleChange}
                fullWidth
                required
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                name="email"
                label="Email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                fullWidth
                required
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                name="password"
                label="Password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                fullWidth
                required
                variant="outlined"
              />
            </Grid>
          </Grid>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            sx={{ mt: 3, px: 4, py: 1.5, fontWeight: 600, borderRadius: 2 }}
            disabled={formLoading}
          >
            {formLoading ? <CircularProgress size={24} /> : 'Add Admin'}
          </Button>
        </Box>
      </Paper>

      {/* Admins List */}
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, color: '#1e293b', mb: 3 }}>
        Existing Admins ({admins.length})
      </Typography>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '30vh' }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Joined</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {admins.map((admin) => {
                const isSelf = user?._id === admin._id || user?.id === admin._id;
                return (
                  <TableRow key={admin._id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                    <TableCell>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {admin.name} {isSelf && <Typography component="span" variant="caption" sx={{ color: '#64748b', ml: 0.5 }}>(you)</Typography>}
                      </Typography>
                    </TableCell>
                    <TableCell>{admin.email}</TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: '#64748b' }}>
                        {format(new Date(admin.createdAt), 'dd MMM yyyy')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <IconButton
                        color="primary"
                        size="small"
                        title="Edit Admin"
                        onClick={() => openEditDialog(admin)}
                        sx={{ mr: 0.5 }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        color="error"
                        size="small"
                        title={isSelf ? 'Cannot delete your own account' : 'Delete Admin'}
                        onClick={() => handleDelete(admin._id)}
                        disabled={isSelf}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Edit Admin Dialog */}
      <Dialog open={editDialogOpen} onClose={closeEditDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600, color: '#1e293b' }}>Edit Admin</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                name="name"
                label="Full Name"
                value={editFormData.name}
                onChange={handleEditChange}
                fullWidth
                required
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="email"
                label="Email"
                type="email"
                value={editFormData.email}
                onChange={handleEditChange}
                fullWidth
                required
                variant="outlined"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={closeEditDialog} sx={{ fontWeight: 600, color: '#64748b' }}>
            Cancel
          </Button>
          <Button
            onClick={handleEditSubmit}
            variant="contained"
            disabled={editLoading}
            sx={{ fontWeight: 600, borderRadius: 2 }}
          >
            {editLoading ? <CircularProgress size={22} /> : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ManageAdmins;
