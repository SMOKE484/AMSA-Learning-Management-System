import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { SnackbarProvider } from './context/SnackbarContext.jsx';
import GlobalSnackbar from './components/common/GlobalSnackbar.jsx';

// MUI Imports
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';

// --- DEFINE LIGHT THEME PALETTE ---
const palette = {
  mode: 'light',
  primary: {
    main: '#E23724', // Keep AMSA red as primary
    light: '#FF6F5E',
    dark: '#A80000',
    contrastText: '#ffffff',
  },
  secondary: {
    main: '#007B8C', // Keep AMSA teal as secondary
    light: '#4CB2BC',
    dark: '#004F5E',
    contrastText: '#ffffff',
  },
  accent: {
    main: '#FFD700', // Keep yellow for highlights
    contrastText: '#000000',
  },
  background: {
    default: '#f8fafc', // Light gray background
    paper: '#ffffff', // White cards/surfaces
  },
  text: {
    primary: '#1e293b', // Dark gray for primary text
    secondary: '#64748b', // Medium gray for secondary text
  },
};

// --- CREATE THE LIGHT THEME ---
const theme = createTheme({
  palette: palette,
  shape: {
    borderRadius: 12, // More rounded corners for modern look
  },
  components: {

    // Add this to the components section in main.jsx
MuiFormControl: {
  styleOverrides: {
    root: {
      '& .MuiInputLabel-root': {
        fontSize: '1rem',
      },
      '& .MuiSelect-select': {
        paddingTop: '12px',
        paddingBottom: '12px',
      },
    },
  },
},
MuiMenuItem: {
  styleOverrides: {
    root: {
      paddingTop: '12px',
      paddingBottom: '12px',
      '&:hover': {
        backgroundColor: '#f1f5f9',
      },
    },
  },
},

    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none', // More modern - no uppercase
          fontWeight: 600,
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          },
        },
        containedPrimary: {
          '&:hover': {
            backgroundColor: '#A80000',
            transform: 'translateY(-1px)',
          },
        },
        containedSecondary: {
          '&:hover': {
            backgroundColor: '#004F5E',
            transform: 'translateY(-1px)',
          },
        },
        outlined: {
          borderWidth: '2px',
          '&:hover': {
            borderWidth: '2px',
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        colorPrimary: {
          backgroundColor: '#ffffff', // White app bar
          color: '#1e293b',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          borderBottom: '1px solid #e2e8f0',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#ffffff', // White sidebar
          color: '#1e293b',
          borderRight: '1px solid #e2e8f0',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          margin: '4px 8px',
          '&:hover': {
            backgroundColor: '#f1f5f9',
            color: palette.primary.main,
          },
          '&.Mui-selected': {
            backgroundColor: palette.primary.main,
            color: palette.primary.contrastText,
            '&:hover': {
              backgroundColor: palette.primary.dark,
            },
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          border: '1px solid #e2e8f0',
        },
        elevation1: {
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        },
        elevation2: {
          boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
          },
        },
      },
    },
    MuiTable: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            backgroundColor: '#f8fafc',
            fontWeight: 600,
            color: '#1e293b',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
        },
      },
    },
  },
  typography: {
    fontFamily: [
      'Inter',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    h4: {
      fontWeight: 700,
      color: '#1e293b',
    },
    h5: {
      fontWeight: 600,
      color: '#1e293b',
    },
    h6: {
      fontWeight: 600,
      color: '#1e293b',
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <AuthProvider>
          <SnackbarProvider>
            <GlobalSnackbar />
            <App />
          </SnackbarProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
);