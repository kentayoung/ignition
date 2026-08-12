import { Button, CircularProgress } from '@mui/material'
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch'

interface Props {
  onLaunch: () => void
  disabled?: boolean
  launching?: boolean
}

export function LaunchAllButton({ onLaunch, disabled, launching }: Props): JSX.Element {
  return (
    <Button
      variant="contained"
      size="large"
      color="primary"
      onClick={onLaunch}
      disabled={disabled || launching}
      startIcon={launching ? <CircularProgress size={18} color="inherit" /> : <RocketLaunchIcon />}
      sx={{ px: 3, py: 1, fontSize: '1rem', fontWeight: 700, boxShadow: 3 }}
    >
      {launching ? 'Launching…' : 'Launch All'}
    </Button>
  )
}
