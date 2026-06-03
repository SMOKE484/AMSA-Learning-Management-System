import React, { useState, useEffect } from 'react';
import {
  Box, CssBaseline, AppBar, Toolbar, Typography, Button, Avatar,
  Dialog, DialogTitle, DialogContent, Tooltip,
} from '@mui/material';
import Sidebar from './Sidebar';
import { useAuth } from '../../hooks/useAuth';
import logo from '../../assets/images/AMSA_Logo.png';
import { getAvatarUrl, getStoredAvatarSeed, saveAvatarSeed, AVATAR_SEEDS } from '../../utils/avatarUtils';

const Layout = ({ children }) => {
  const { user, logoutUser } = useAuth();
  const [avatarSeed, setAvatarSeed] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (user?.id) setAvatarSeed(getStoredAvatarSeed(user.id));
  }, [user?.id]);

  const handlePickAvatar = (seed) => {
    if (user?.id) saveAvatarSeed(user.id, seed);
    setAvatarSeed(seed);
    setPickerOpen(false);
  };

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
            <Tooltip title="Change avatar">
              <Avatar
                src={getAvatarUrl(avatarSeed ?? user.name)}
                alt={user.name}
                onClick={() => setPickerOpen(true)}
                sx={{ width: 40, height: 40, cursor: 'pointer' }}
              />
            </Tooltip>
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
      
      {/* Avatar picker dialog */}
      <Dialog open={pickerOpen} onClose={() => setPickerOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Choose Your Avatar</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1.5 }}>
            {AVATAR_SEEDS.map(seed => (
              <Box
                key={seed}
                onClick={() => handlePickAvatar(seed)}
                sx={{
                  p: 1, borderRadius: 2, cursor: 'pointer', textAlign: 'center',
                  border: '2px solid',
                  borderColor: avatarSeed === seed ? 'primary.main' : 'transparent',
                  '&:hover': { borderColor: 'primary.light', backgroundColor: '#f1f5f9' },
                }}
              >
                <Avatar src={getAvatarUrl(seed)} alt={seed} sx={{ width: 52, height: 52, mx: 'auto' }} />
              </Box>
            ))}
          </Box>
        </DialogContent>
      </Dialog>

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