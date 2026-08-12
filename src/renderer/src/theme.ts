import { createTheme, type ThemeOptions } from '@mui/material/styles'

// Custom accent + shape tokens so the app reads as designed rather than a
// stock MUI starter. Palette lifted from GitHub's UI (Primer): the same
// green used for their primary "Code"/"Merge" buttons, blue for secondary
// accents (mirrors their link color), and near-black/near-white canvas +
// subtle-surface tones instead of the previous warm neutrals.
const shared: ThemeOptions = {
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: [
      'Inter',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      'sans-serif'
    ].join(','),
    button: { textTransform: 'none', fontWeight: 600 }
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 10 }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' }
      }
    },
    MuiListItem: {
      styleOverrides: {
        root: { borderRadius: 10 }
      }
    }
  }
}

export const lightTheme = createTheme({
  ...shared,
  palette: {
    mode: 'light',
    primary: { main: '#1f883d' },
    secondary: { main: '#0969da' },
    background: { default: '#f6f8fa', paper: '#ffffff' },
    divider: '#d0d7de'
  }
})

export const darkTheme = createTheme({
  ...shared,
  palette: {
    mode: 'dark',
    primary: { main: '#3fb950' },
    secondary: { main: '#58a6ff' },
    background: { default: '#0d1117', paper: '#161b22' },
    divider: '#30363d'
  }
})
