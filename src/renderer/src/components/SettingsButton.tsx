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
  TextField,
  Typography,
  Box,
  Divider,
  CircularProgress
} from '@mui/material'
import SettingsIcon from '@mui/icons-material/Settings'
import type { AppSettings, UpdateCheckResult } from '@shared/types'

// Electron has no login-item support on Linux.
const SUPPORTS_LAUNCH_ON_STARTUP = window.api.app.platform !== 'linux'

export function SettingsButton(): JSX.Element {
  const [open, setOpen] = useState(false)
  const [settings, setSettings] = useState<AppSettings | null>(null)
  // Local text mirror so typing/clearing isn't clamped back on every keystroke.
  const [delayInput, setDelayInput] = useState('0')

  const [version, setVersion] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState<UpdateCheckResult | null>(null)

  useEffect(() => {
    window.api.settings.get().then((s) => {
      setSettings(s)
      setDelayInput(String(s.launchOnStartupDelaySeconds))
    })
    window.api.app.getVersion().then(setVersion)
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
    setSettings((s) => (s ? { ...s, autoCheckForUpdates: checked } : s))
    void window.api.settings.setAutoCheckForUpdates(checked)
  }

  const toggleLaunchOnStartup = (checked: boolean): void => {
    setSettings((s) => (s ? { ...s, launchOnStartup: checked } : s))
    void window.api.settings.setLaunchOnStartup(checked)
  }

  const commitDelay = (): void => {
    const seconds = Math.max(0, Math.min(3600, Math.round(Number(delayInput) || 0)))
    setDelayInput(String(seconds))
    setSettings((s) => (s ? { ...s, launchOnStartupDelaySeconds: seconds } : s))
    void window.api.settings.setLaunchOnStartupDelaySeconds(seconds)
  }

  return (
    <>
      <Tooltip title="Settings">
        <IconButton onClick={() => setOpen(true)} color="inherit">
          <SettingsIcon />
        </IconButton>
      </Tooltip>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Settings</DialogTitle>
        <DialogContent>
          {settings && (
            <>
              <Typography variant="overline" color="text.secondary">
                Updates
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {version ? `Ignition v${version}` : ' '}
              </Typography>

              <FormControlLabel
                control={
                  <Switch
                    checked={settings.autoCheckForUpdates}
                    onChange={(e) => toggleAutoCheck(e.target.checked)}
                  />
                }
                label="Automatically check for updates on launch"
              />

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 1.5 }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={runCheck}
                  disabled={checking}
                  startIcon={checking ? <CircularProgress size={16} /> : undefined}
                >
                  {checking ? 'Checking…' : 'Check for Updates'}
                </Button>
              </Box>

              {result && !checking && (
                <Box sx={{ mt: 1.5 }}>
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

              <Divider sx={{ my: 2 }} />

              <Typography variant="overline" color="text.secondary">
                Startup
              </Typography>

              <FormControlLabel
                sx={{ display: 'flex' }}
                control={
                  <Switch
                    checked={settings.launchOnStartup}
                    disabled={!SUPPORTS_LAUNCH_ON_STARTUP}
                    onChange={(e) => toggleLaunchOnStartup(e.target.checked)}
                  />
                }
                label="Launch Ignition at startup"
              />

              <Box sx={{ mt: 1.5, ml: 0.5 }}>
                <TextField
                  label="Startup delay"
                  type="number"
                  size="small"
                  value={delayInput}
                  disabled={!SUPPORTS_LAUNCH_ON_STARTUP || !settings.launchOnStartup}
                  onChange={(e) => setDelayInput(e.target.value)}
                  onBlur={commitDelay}
                  slotProps={{ htmlInput: { min: 0, max: 3600 } }}
                  sx={{ width: 140 }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  {SUPPORTS_LAUNCH_ON_STARTUP
                    ? 'Seconds to wait after login before opening.'
                    : 'Not supported on Linux.'}
                </Typography>
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
