import { useEffect, useState } from 'react'
import {
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControlLabel,
  Switch,
  Typography,
  CircularProgress,
  Box
} from '@mui/material'
import UpdateIcon from '@mui/icons-material/Update'
import type { UpdateCheckResult } from '@shared/types'

export function UpdatesButton(): JSX.Element {
  const [open, setOpen] = useState(false)
  const [version, setVersion] = useState<string | null>(null)
  const [autoCheck, setAutoCheck] = useState(true)
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState<UpdateCheckResult | null>(null)

  useEffect(() => {
    window.api.app.getVersion().then(setVersion)
    window.api.settings.get().then((s) => setAutoCheck(s.autoCheckForUpdates))
  }, [])

  // Auto-check-on-launch pushes here unprompted; only fires when something's newer.
  useEffect(() => window.api.updates.onAvailable(setResult), [])

  const runCheck = async (): Promise<void> => {
    setChecking(true)
    try {
      setResult(await window.api.updates.check())
    } finally {
      setChecking(false)
    }
  }

  const toggleAutoCheck = (checked: boolean): void => {
    setAutoCheck(checked)
    void window.api.settings.setAutoCheckForUpdates(checked)
  }

  return (
    <>
      <Tooltip title="Updates">
        <IconButton onClick={() => setOpen(true)} color="inherit">
          <UpdateIcon />
        </IconButton>
      </Tooltip>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Updates</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {version ? `Ignition v${version}` : ' '}
          </Typography>

          <FormControlLabel
            control={
              <Switch checked={autoCheck} onChange={(e) => toggleAutoCheck(e.target.checked)} />
            }
            label="Automatically check for updates on launch"
          />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 2 }}>
            <Button
              variant="outlined"
              onClick={runCheck}
              disabled={checking}
              startIcon={checking ? <CircularProgress size={16} /> : undefined}
            >
              {checking ? 'Checking…' : 'Check for Updates'}
            </Button>
          </Box>

          {result && !checking && (
            <Box sx={{ mt: 2 }}>
              {result.status === 'update-available' && (
                <>
                  <Typography variant="body2">
                    Update available: v{result.latestVersion} (you have v{result.currentVersion})
                  </Typography>
                  <Button
                    size="small"
                    sx={{ mt: 1 }}
                    onClick={() => window.api.updates.openLatestRelease()}
                  >
                    View Release
                  </Button>
                </>
              )}
              {result.status === 'up-to-date' && (
                <Typography variant="body2" color="text.secondary">
                  {result.message ?? `You're up to date (v${result.currentVersion}).`}
                </Typography>
              )}
              {result.status === 'error' && (
                <Typography variant="body2" color="error">
                  Couldn't check for updates{result.message ? `: ${result.message}` : '.'}
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
