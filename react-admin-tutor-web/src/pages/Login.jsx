import React, { useState } from 'react';
import { login } from '../services/apiService';
import { useAuth } from '../hooks/useAuth';
import { useNavigate, Navigate } from 'react-router-dom';
import {
  Container,
  Box,
  TextField,
  Button,
  Typography,
  CircularProgress,
  useTheme,
} from '@mui/material';
import { useSnackbar } from '../context/SnackbarContext';

import logo from '../assets/images/AMSA_Logo.png';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { loginUser, isAuthenticated, role, logoutUser } = useAuth();
  const { showSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const theme = useTheme();

  // handleSubmit function in Login.jsx
  const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);

  try {
    
    const data = await login(email, password);

    
    if (data.user.role === 'admin' || data.user.role === 'tutor') {
      loginUser(data);
      
      const path = data.user.role === 'admin' ? '/admin/dashboard' : '/tutor/dashboard';
      
      navigate(path, { replace: true });
    } else {
      showSnackbar('Only Admin and Tutor accounts are allowed.', 'warning');
      logoutUser();
    }
  } catch (err) {
    console.error('❌ Login error:', err);
    showSnackbar(err.message || 'Failed to login', 'error');
  } finally {
    setLoading(false);
  }
};


  if (isAuthenticated) {
    const path = role === 'admin' ? '/admin/dashboard' : '/tutor/dashboard';
    return <Navigate to={path} replace />;
  }

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      display: 'flex',
      background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)'
    }}>
      {/* Left Brand Section */}
      <Box
        sx={{
          flex: 1,
          display: { xs: 'none', lg: 'flex' },
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          p: 6,
          background: 'linear-gradient(135deg, #E23724 0%, #007B8C 100%)',
          color: 'white',
        }}
      >
        <Box sx={{ textAlign: 'center', maxWidth: 500 }}>
          <img src={logo} alt="AMSA Logo" style={{ width: '120px', marginBottom: '2rem' }} />
          <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 700, mb: 3 }}>
            AMSA LMS
          </Typography>
          <Typography variant="h5" sx={{ opacity: 0.9, fontWeight: 500 }}>
            Learning Management System
          </Typography>
          <Typography variant="body1" sx={{ mt: 2, opacity: 0.8 }}>
            Admin & Tutor Portal - Streamline education management
          </Typography>
        </Box>
      </Box>

      {/* Right Form Section */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          p: { xs: 2, sm: 4 },
        }}
      >
        <Box
          sx={{
            width: '100%',
            maxWidth: '450px',
            p: { xs: 3, sm: 5 },
            borderRadius: 3,
            background: '#ffffff',
            boxShadow: '0 20px 60px rgba(0,0,0,0.1)',
            border: '1px solid #e2e8f0',
          }}
        >
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography component="h1" variant="h4" sx={{ color: '#1e293b', mb: 1, fontWeight: 700 }}>
              Welcome Back
            </Typography>
            <Typography variant="body1" sx={{ color: '#64748b' }}>
              Sign in to your account
            </Typography>
          </Box>
          
          <Box component="form" onSubmit={handleSubmit} noValidate>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              autoFocus
              variant="outlined"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              sx={{ mb: 3 }}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              variant="outlined"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              sx={{ mb: 4 }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              sx={{
                py: 1.5,
                fontSize: '1rem',
                fontWeight: 600,
                borderRadius: 2,
                textTransform: 'none',
                boxShadow: 'none',
                '&:hover': {
                  boxShadow: '0 4px 12px rgba(226, 55, 36, 0.3)',
                  transform: 'translateY(-1px)',
                },
              }}
            >
              {loading ? <CircularProgress size={24} sx={{ color: 'primary.contrastText' }} /> : 'Sign In'}
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default Login;