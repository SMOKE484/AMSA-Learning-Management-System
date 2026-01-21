import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, IconButton,
  FormControl, InputLabel, Select, MenuItem, Button, Grid,
  CircularProgress, Alert
} from '@mui/material';
import { 
  Delete as DeleteIcon, 
  FilterList as FilterIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { marksService } from '../../services/marksService'; // Ensure path is correct
import { academicService } from '../../services/academicService'; // Ensure path is correct
import { useSnackbar } from '../../context/SnackbarContext';

const ManageMarks = () => {
  const [marks, setMarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [grades, setGrades] = useState([]);
  const [subjects, setSubjects] = useState([]);
  
  // Filter State
  const [filters, setFilters] = useState({
    grade: 'all',
    subject: 'all',
    sortBy: 'newest'
  });

  const { showSnackbar } = useSnackbar();

  useEffect(() => {
    loadConfig();
    fetchMarks();
  }, []);

  // Re-fetch when filters change
  useEffect(() => {
    fetchMarks();
  }, [filters]);

  const loadConfig = async () => {
    try {
      const g = await academicService.getGrades();
      const s = await academicService.getSubjects();
      setGrades(g || []);
      setSubjects(s || []);
    } catch (error) {
      console.error("Config load error", error);
    }
  };

  const fetchMarks = async () => {
    setLoading(true);
    try {
      // Clean filters for API
      const apiFilters = {};
      if (filters.grade !== 'all') apiFilters.grade = filters.grade;
      if (filters.subject !== 'all') apiFilters.subject = filters.subject;
      apiFilters.sortBy = filters.sortBy;

      const data = await marksService.getAllMarks(apiFilters);
      setMarks(data.marks || []);
    } catch (error) {
      console.error(error);
      showSnackbar('Failed to fetch marks', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this mark permanently?")) return;
    try {
      await marksService.deleteMark(id);
      showSnackbar('Mark deleted successfully', 'success');
      fetchMarks(); // Refresh list
    } catch (error) {
      showSnackbar('Failed to delete mark', 'error');
    }
  };

  const getScoreColor = (score, total) => {
    const percentage = (score / total) * 100;
    if (percentage >= 80) return "success"; // Distinction
    if (percentage < 40) return "error";    // Fail
    return "default";
  };

  const getPercentage = (score, total) => {
    if(!total) return 0;
    return Math.round((score / total) * 100);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e293b' }}>
          Student Results & Marks
        </Typography>
        <Button 
          startIcon={<RefreshIcon />} 
          onClick={fetchMarks}
          sx={{ color: '#64748b' }}
        >
          Refresh
        </Button>
      </Box>

      {/* Filters Section */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Filter by Grade</InputLabel>
              <Select
                value={filters.grade}
                label="Filter by Grade"
                onChange={(e) => setFilters({...filters, grade: e.target.value})}
              >
                <MenuItem value="all">All Grades</MenuItem>
                {grades.map(g => <MenuItem key={g} value={g}>Grade {g}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Filter by Subject</InputLabel>
              <Select
                value={filters.subject}
                label="Filter by Subject"
                onChange={(e) => setFilters({...filters, subject: e.target.value})}
              >
                <MenuItem value="all">All Subjects</MenuItem>
                {subjects.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Sort By</InputLabel>
              <Select
                value={filters.sortBy}
                label="Sort By"
                onChange={(e) => setFilters({...filters, sortBy: e.target.value})}
              >
                <MenuItem value="newest">Recently Added</MenuItem>
                <MenuItem value="highest">Highest Marks (Top)</MenuItem>
                <MenuItem value="lowest">Lowest Marks (At Risk)</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <Button 
              fullWidth 
              variant="outlined" 
              startIcon={<FilterIcon />}
              onClick={() => setFilters({ grade: 'all', subject: 'all', sortBy: 'newest' })}
              sx={{ borderColor: '#e2e8f0', color: '#64748b' }}
            >
              Reset Filters
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Marks Table */}
      <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <Table>
          <TableHead sx={{ bgcolor: '#f8fafc' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Student Name</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Grade</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Subject</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Assessment</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Score</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Percentage</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                  <CircularProgress size={30} />
                </TableCell>
              </TableRow>
            ) : marks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                  <Typography color="text.secondary">No marks found matching your filters.</Typography>
                </TableCell>
              </TableRow>
            ) : (
              marks.map((mark) => (
                <TableRow key={mark._id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600} color="#1e293b">
                      {mark.student?.user?.name || 'Unknown Student'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {mark.student?.user?.email}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={mark.grade} 
                      size="small" 
                      sx={{ borderRadius: 1, bgcolor: '#f1f5f9', fontWeight: 600 }} 
                    />
                  </TableCell>
                  <TableCell>{mark.subject}</TableCell>
                  <TableCell>{mark.testName}</TableCell>
                  <TableCell>
                    <Typography fontWeight={600}>
                      {mark.score} / {mark.total}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={`${getPercentage(mark.score, mark.total)}%`} 
                      color={getScoreColor(mark.score, mark.total)}
                      size="small"
                      variant={getScoreColor(mark.score, mark.total) === 'default' ? 'outlined' : 'filled'}
                    />
                  </TableCell>
                  <TableCell sx={{ color: '#64748b', fontSize: '0.875rem' }}>
                    {format(new Date(mark.createdAt), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton 
                      color="error" 
                      onClick={() => handleDelete(mark._id)}
                      size="small"
                      title="Delete Mark"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default ManageMarks;