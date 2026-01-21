import React from 'react';
import { Snackbar, Alert } from '@mui/material';
import { useSnackbar } from '../../context/SnackbarContext';

const GlobalSnackbar = () => {
  const { snackbar, closeSnackbar } = useSnackbar();
  const { open, message, severity } = snackbar;

  return (
    <Snackbar
      open={open}
      autoHideDuration={5000}
      onClose={closeSnackbar}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      sx={{
        '& .MuiSnackbarContent-root': {
          borderRadius: 2,
        }
      }}
    >
      <Alert
        onClose={closeSnackbar}
        severity={severity}
        variant="filled"
        sx={{ 
          width: '100%',
          borderRadius: 2,
          fontWeight: 500,
          '& .MuiAlert-icon': {
            fontSize: '1.25rem'
          }
        }}
      >
        {message}
      </Alert>
    </Snackbar>
  );
};

export default GlobalSnackbar;