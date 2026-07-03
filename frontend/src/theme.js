import { createTheme } from '@mui/material/styles';

// Palette grounded in the actual product: tanned leather, saddle stitching,
// brass hardware - not default Material blue.
const leather = '#7B4B2A';      // saddle brown - primary
const leatherDark = '#4A2E1B';  // espresso - sidebar background
const brass = '#B08D57';        // brass hardware accent
const cream = '#F7F3EC';        // undyed leather / parchment - page background
const ink = '#2A211C';          // primary text

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: leather, dark: '#5E3A20', light: '#9C6B45', contrastText: '#FFF8F0' },
    secondary: { main: brass, contrastText: '#2A211C' },
    background: { default: cream, paper: '#FFFFFF' },
    text: { primary: ink, secondary: '#6B5D51' },
    error: { main: '#B3261E' },
    success: { main: '#3E6B4F' },
    divider: '#E4DACD',
  },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily: '"Inter", "Segoe UI", Roboto, sans-serif',
    h1: { fontFamily: '"Fraunces", Georgia, serif', fontWeight: 600 },
    h2: { fontFamily: '"Fraunces", Georgia, serif', fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 6, paddingLeft: 16, paddingRight: 16 },
      },
      defaultProps: { disableElevation: true },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: { backgroundColor: leatherDark, color: '#F0E6D8', border: 'none' },
      },
    },
  },
});

export const sidebarColors = { leatherDark, brass, cream };

export default theme;
