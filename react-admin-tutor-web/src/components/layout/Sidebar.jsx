import React from 'react';
import { 
  Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, 
  Toolbar, Box, Divider 
} from '@mui/material';
import { useAuth } from '../../hooks/useAuth'; // Adjusted path based on your structure
import { Link, useLocation } from 'react-router-dom';

// Icons
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import PersonIcon from '@mui/icons-material/Person';
import SchoolIcon from '@mui/icons-material/School';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import BarChartIcon from '@mui/icons-material/BarChart'; // For Marks
import NoteAddIcon from '@mui/icons-material/NoteAdd';
import FactCheckIcon from '@mui/icons-material/FactCheck';

const drawerWidth = 260;

const Sidebar = () => {
  const { role } = useAuth();
  const location = useLocation();

  // Admin Links
  const adminLinks = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/admin/dashboard' },
    { text: 'Manage Students', icon: <SchoolIcon />, path: '/admin/students' }, // Changed to School Icon
    { text: 'Manage Tutors', icon: <PersonIcon />, path: '/admin/tutors' },
    { text: 'Manage Parents', icon: <PeopleIcon />, path: '/admin/parents' },
    { text: 'Manage Schedules', icon: <CalendarMonthIcon />, path: '/admin/schedules' },
    { text: 'Attendance', icon: <FactCheckIcon />, path: '/admin/attendance' },
    { text: 'Manage Marks', icon: <BarChartIcon />, path: '/admin/marks' }, // <--- NEW PAGE LINK
    { text: 'School Config', icon: <SchoolIcon />, path: '/admin/school-config' },
  ];

  // Tutor Links
  const tutorLinks = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/tutor/dashboard' },
    { text: 'My Students', icon: <PeopleIcon />, path: '/tutor/students' },
    { text: 'Timetable', icon: <CalendarMonthIcon />, path: '/tutor/timetable' },
    { text: 'Attendance', icon: <FactCheckIcon />, path: '/tutor/attendance' },
    { text: 'Upload Notes', icon: <NoteAddIcon />, path: '/tutor/notes' },
    { text: 'Upload Marks', icon: <BarChartIcon />, path: '/tutor/marks' },
  ];

  const links = role === 'admin' ? adminLinks : tutorLinks;

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: { 
          width: drawerWidth, 
          boxSizing: 'border-box',
          backgroundColor: '#ffffff',
          borderRight: '1px solid #e2e8f0',
        },
      }}
    >
      <Toolbar /> {/* Spacer for top AppBar */}
      <Box sx={{ overflow: 'auto', p: 2 }}>
        <List>
          {links.map((item) => (
            <ListItem key={item.text} disablePadding sx={{ mb: 1 }}>
              <ListItemButton 
                component={Link} 
                to={item.path}
                selected={location.pathname === item.path}
                sx={{ 
                  borderRadius: 2,
                  py: 1.5,
                  '&.Mui-selected': {
                    backgroundColor: 'primary.main',
                    color: 'primary.contrastText',
                    '& .MuiListItemIcon-root': {
                      color: 'primary.contrastText',
                    },
                    '&:hover': {
                      backgroundColor: 'primary.dark',
                    }
                  },
                  '&:hover': {
                    backgroundColor: '#f1f5f9',
                  }
                }}
              >
                <ListItemIcon sx={{ 
                  color: location.pathname === item.path ? 'inherit' : '#64748b', 
                  minWidth: 45 
                }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.text} 
                  primaryTypographyProps={{ 
                    fontWeight: location.pathname === item.path ? 600 : 500,
                    fontSize: '0.95rem'
                  }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>
    </Drawer>
  );
};

export default Sidebar;