// pages/Admin/ManageParents.jsx
import React, { useState, useEffect } from 'react';
import {
  Box, Typography, TextField, Button, Paper, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, CircularProgress,
  Grid, FormControl, InputLabel, Select, MenuItem, Chip, OutlinedInput,
  Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import { format } from 'date-fns';
import api from '../../services/apiService';
import { useSnackbar } from '../../context/SnackbarContext';

const ManageParents = () => {
  const [parents, setParents] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });

  const [linkFormData, setLinkFormData] = useState({
    parentId: ''
  });

  const { showSnackbar } = useSnackbar();

  // Fetch parents and students
  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch students (this endpoint exists)
      const studentsRes = await api.get('/admin/students');
      setStudents(studentsRes.data.students);

      // Try to fetch parents - if endpoint doesn't exist, we'll handle it
      try {
        const parentsRes = await api.get('/admin/parents');
        setParents(parentsRes.data.parents || []);
      } catch (parentError) {
        console.log('Parents endpoint not available yet, using empty array');
        setParents([]);
      }
      
    } catch (err) {
      console.error('Failed to fetch data:', err);
      showSnackbar('Failed to fetch data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [showSnackbar]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLinkChange = (e) => {
    setLinkFormData({ ...linkFormData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.password) {
      showSnackbar('All fields are required.', 'error');
      return;
    }

    try {
      setFormLoading(true);
      
      // This endpoint exists in your adminController
      await api.post('/admin/parents', formData);
      
      showSnackbar('Parent added successfully!', 'success');
      setFormData({ 
        name: '', 
        email: '', 
        password: ''
      });
      
      // Refetch data
      await fetchData();
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Failed to create parent.', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  const handleLinkSubmit = async (e) => {
    e.preventDefault();

    if (!linkFormData.parentId || !selectedStudent) {
      showSnackbar('Please select a parent to link.', 'error');
      return;
    }

    try {
      // This endpoint exists in your adminController
      await api.post(`/admin/students/${selectedStudent._id}/link-parent`, {
        parentId: linkFormData.parentId
      });
      
      showSnackbar('Parent linked successfully!', 'success');
      setLinkDialogOpen(false);
      setLinkFormData({ parentId: '' });
      setSelectedStudent(null);
      
      // Refetch students to get updated parent links
      await fetchData();
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Failed to link parent.', 'error');
    }
  };

  const openLinkDialog = (student) => {
    setSelectedStudent(student);
    setLinkDialogOpen(true);
  };

  const closeLinkDialog = () => {
    setLinkDialogOpen(false);
    setSelectedStudent(null);
    setLinkFormData({ parentId: '' });
  };

  // Helper function to count linked students for a parent
  const getLinkedStudentCount = (parentId) => {
    return students.filter(student => 
      student.parents && student.parents.includes(parentId)
    ).length;
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ mb: 4, fontWeight: 700, color: '#1e293b' }}>
        Manage Parents
      </Typography>
      
      {/* Create Parent Form */}
      <Paper 
        sx={{ 
          p: 4, 
          mb: 4,
          borderRadius: 3,
          boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
        }}
      >
        <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, color: '#1e293b', mb: 3 }}>
          Add New Parent
        </Typography>
        <Box component="form" onSubmit={handleSubmit} noValidate>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
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
            <Grid item xs={12} sm={6}>
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
            <Grid item xs={12}>
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
            sx={{ 
              mt: 3,
              px: 4,
              py: 1.5,
              fontWeight: 600,
              borderRadius: 2
            }}
            disabled={formLoading}
          >
            {formLoading ? <CircularProgress size={24} /> : 'Add Parent'}
          </Button>
        </Box>
      </Paper>

      {/* Parents List */}
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, color: '#1e293b', mb: 3 }}>
        Existing Parents ({parents.length})
      </Typography>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '30vh' }}>
          <CircularProgress />
        </Box>
      ) : parents.length > 0 ? (
        <TableContainer 
          component={Paper} 
          variant="outlined"
          sx={{ borderRadius: 2, mb: 4 }}
        >
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Linked Students</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Joined</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {parents.map((parent) => (
                <TableRow 
                  key={parent._id}
                  sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                >
                  <TableCell>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {parent.name}
                    </Typography>
                  </TableCell>
                  <TableCell>{parent.email}</TableCell>
                  <TableCell>
                    <Chip 
                      label={`${getLinkedStudentCount(parent._id)} students`}
                      size="small"
                      color={getLinkedStudentCount(parent._id) > 0 ? "primary" : "default"}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ color: '#64748b' }}>
                      {format(new Date(parent.createdAt), 'dd MMM yyyy')}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Paper 
          sx={{ 
            p: 4, 
            textAlign: 'center',
            borderRadius: 3,
            backgroundColor: '#f8fafc',
            border: '2px dashed #e2e8f0',
            mb: 4
          }}
        >
          <Typography variant="h6" sx={{ color: '#64748b', mb: 1 }}>
            No Parents Found
          </Typography>
          <Typography variant="body2" sx={{ color: '#94a3b8' }}>
            Create your first parent account using the form above.
          </Typography>
        </Paper>
      )}

      {/* Link Parents to Students Section */}
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, color: '#1e293b', mb: 3 }}>
        Link Parents to Students
      </Typography>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '30vh' }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer 
          component={Paper} 
          variant="outlined"
          sx={{ borderRadius: 2 }}
        >
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Student Name</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Grade</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Linked Parents</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {students.map((student) => (
                <TableRow 
                  key={student._id}
                  sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                >
                  <TableCell>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {student.user?.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      Grade {student.grade}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {student.parents && student.parents.length > 0 ? (
                        student.parents.map((parentId) => {
                          const parent = parents.find(p => p._id === parentId);
                          return (
                            <Chip 
                              key={parentId} 
                              label={parent ? parent.name : `Parent ${parentId.substring(0, 8)}...`}
                              size="small" 
                              variant="outlined"
                              sx={{
                                borderColor: '#e2e8f0',
                                color: '#64748b',
                                fontWeight: 500
                              }}
                            />
                          );
                        })
                      ) : (
                        <Typography variant="body2" sx={{ color: '#94a3b8', fontStyle: 'italic' }}>
                          No parents linked
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="outlined" 
                      size="small"
                      onClick={() => openLinkDialog(student)}
                      sx={{ 
                        borderRadius: 2,
                        fontWeight: 600
                      }}
                      disabled={parents.length === 0}
                    >
                      Link Parent
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Link Parent Dialog */}
      <Dialog 
        open={linkDialogOpen} 
        onClose={closeLinkDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 600, color: '#1e293b' }}>
          Link Parent to {selectedStudent?.user?.name}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <FormControl fullWidth required>
              <InputLabel id="parent-select-label">Select Parent</InputLabel>
              <Select
                labelId="parent-select-label"
                name="parentId"
                value={linkFormData.parentId}
                label="Select Parent"
                onChange={handleLinkChange}
              >
                {parents.map((parent) => (
                  <MenuItem key={parent._id} value={parent._id}>
                    {parent.name} ({parent.email})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button 
            onClick={closeLinkDialog}
            sx={{ 
              fontWeight: 600,
              color: '#64748b'
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleLinkSubmit}
            variant="contained"
            sx={{ 
              fontWeight: 600,
              borderRadius: 2
            }}
          >
            Link Parent
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ManageParents;