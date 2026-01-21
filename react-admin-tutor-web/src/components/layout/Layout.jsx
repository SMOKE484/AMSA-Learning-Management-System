import React from 'react';
import { Box, CssBaseline, AppBar, Toolbar, Typography, Button, Avatar } from '@mui/material';
import Sidebar from './Sidebar';
import { useAuth } from '../../hooks/useAuth';
import logo from '../../assets/images/AMSA_Logo.png';

const Layout = ({ children }) => {
  const { user, logoutUser } = useAuth();

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          backgroundColor: '#ffffff',
          color: '#1e293b',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        <Toolbar>
          <Box
            component="img"
            src={logo}
            alt="AMSA Logo"
            sx={{ height: 40, mr: 2 }}
          />
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, fontWeight: 700 }}>
            
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1e293b' }}>
                {user.name}
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b', textTransform: 'capitalize' }}>
                {user.role}
              </Typography>
            </Box>
            <Avatar 
              sx={{ 
                width: 40, 
                height: 40, 
                bgcolor: 'primary.main',
                fontSize: '1rem',
                fontWeight: 600
              }}
            >
              {user.name.charAt(0).toUpperCase()}
            </Avatar>
            <Button 
              variant="outlined" 
              onClick={logoutUser}
              sx={{ 
                borderColor: '#e2e8f0',
                color: '#64748b',
                fontWeight: 600,
                '&:hover': {
                  borderColor: '#94a3b8',
                  backgroundColor: '#f8fafc'
                }
              }}
            >
              Logout
            </Button>
          </Box>
        </Toolbar>
      </AppBar>
      
      <Sidebar />
      
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          backgroundColor: '#f8fafc',
          minHeight: '100vh'
        }}
      >
        <Toolbar />
        <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default Layout;