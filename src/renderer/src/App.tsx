import { useCallback, useEffect, useState } from 'react'
import {
  ThemeProvider,
  CssBaseline,
  AppBar,
  Toolbar,
  Typography,
  Box,
  Paper,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  CircularProgress
} from '@mui/material'
import type { LaunchResult } from '@shared/types'
import { lightTheme, darkTheme } from './theme'
import { useThemeMode } from './hooks/useThemeMode'
import { useProfiles } from './hooks/useProfiles'
import { ProfileTabs } from './components/ProfileTabs'
import { ProgramList } from './components/ProgramList'
import { AddProgramButton } from './components/AddProgramButton'
import { LaunchAllButton } from './components/LaunchAllButton'
import { ThemeToggle } from './components/ThemeToggle'
import { SettingsButton } from './components/SettingsButton'

function summarize(results: LaunchResult[]): { text: string; severity: 'success' | 'warning' | 'error' } {
  const launched = results.filter((r) => r.status === 'launched').length
  const skipped = results.filter((r) => r.status === 'skipped-running').length
  const errored = results.filter((r) => r.status === 'error').length

  const parts: string[] = []
  if (launched) parts.push(`${launched} launched`)
  if (skipped) parts.push(`${skipped} already running`)
  if (errored) parts.push(`${errored} failed`)

  return {
    text: parts.join(' · ') || 'Nothing to launch',
    severity: errored ? 'error' : skipped && !launched ? 'warning' : 'success'
  }
}

export default function App(): JSX.Element {
  const { mode, resolved, setMode } = useThemeMode()
  const {
    profiles,
    activeProfile,
    activeProfileId,
    loading,
    selectProfile,
    createProfile,
    renameProfile,
    deleteProfile,
    addEntry,
    removeEntry,
    updateEntry,
    reorderEntries
  } = useProfiles()

  const [runningStatus, setRunningStatus] = useState<Record<string, boolean>>({})
  const [launching, setLaunching] = useState(false)
  const [snack, setSnack] = useState<{ text: string; severity: 'success' | 'warning' | 'error' } | null>(
    null
  )
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  const refreshStatus = useCallback(async () => {
    if (!activeProfileId) return
    const status = await window.api.status.getRunning(activeProfileId)
    setRunningStatus(status)
  }, [activeProfileId])

  useEffect(() => {
    refreshStatus()
    const interval = setInterval(refreshStatus, 4000)
    return () => clearInterval(interval)
  }, [refreshStatus])

  // Auto-check-on-launch (if enabled in settings) pushes here unprompted, separately from
  // whatever the Updates dialog itself is showing — this is just the "hey, heads up" toast.
  useEffect(
    () =>
      window.api.updates.onAvailable((result) => {
        setSnack({ text: `Update available: v${result.latestVersion}`, severity: 'success' })
      }),
    []
  )

  const handlePickProgram = async (): Promise<void> => {
    const picked = await window.api.dialog.pickProgram()
    if (!picked) return
    await addEntry({
      displayName: picked.suggestedName,
      path: picked.path,
      args: [],
      iconDataUrl: picked.iconDataUrl
    })
  }

  const handleLaunchAll = async (): Promise<void> => {
    if (!activeProfileId) return
    setLaunching(true)
    try {
      const results = await window.api.launch.profile(activeProfileId)
      setSnack(summarize(results))
      await refreshStatus()
    } finally {
      setLaunching(false)
    }
  }

  const handleLaunchOne = async (entryId: string): Promise<void> => {
    if (!activeProfileId) return
    const result = await window.api.launch.entry(activeProfileId, entryId)
    setSnack(summarize([result]))
    await refreshStatus()
  }

  const confirmDelete = pendingDeleteId ? profiles.find((p) => p.id === pendingDeleteId) : null

  return (
    <ThemeProvider theme={resolved === 'dark' ? darkTheme : lightTheme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', bgcolor: 'background.default' }}>
        <AppBar position="static" elevation={0} color="transparent" sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Toolbar
            sx={{
              WebkitAppRegion: 'drag',
              display: 'grid',
              gridTemplateColumns: '1fr auto 1fr'
            }}
          >
            <Box />
            <Typography variant="h6" sx={{ fontWeight: 700, justifySelf: 'center', letterSpacing: 0.5 }}>
              Ignition
            </Typography>
            <Box sx={{ WebkitAppRegion: 'no-drag', justifySelf: 'end', display: 'flex' }}>
              <SettingsButton />
              <ThemeToggle mode={mode} resolved={resolved} onChange={setMode} />
            </Box>
          </Toolbar>
        </AppBar>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <ProfileTabs
              profiles={profiles}
              activeProfileId={activeProfileId}
              onSelect={selectProfile}
              onCreate={createProfile}
              onRename={renameProfile}
              onDelete={setPendingDeleteId}
            />

            <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
              <Paper variant="outlined" sx={{ p: 2, minHeight: '100%' }}>
                {activeProfile && (
                  <ProgramList
                    entries={activeProfile.entries}
                    runningStatus={runningStatus}
                    onReorder={reorderEntries}
                    onRemove={removeEntry}
                    onLaunchOne={handleLaunchOne}
                    onIconResolved={(entryId, iconDataUrl) => updateEntry(entryId, { iconDataUrl })}
                  />
                )}
              </Paper>
            </Box>

            <Box
              component="footer"
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                px: 3,
                py: 2,
                borderTop: 1,
                borderColor: 'divider',
                bgcolor: 'background.paper'
              }}
            >
              <AddProgramButton onPick={handlePickProgram} disabled={!activeProfile} />
              <LaunchAllButton
                onLaunch={handleLaunchAll}
                disabled={!activeProfile || activeProfile.entries.length === 0}
                launching={launching}
              />
            </Box>
          </>
        )}
      </Box>

      <Snackbar
        open={!!snack}
        autoHideDuration={4000}
        onClose={() => setSnack(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {snack ? (
          <Alert severity={snack.severity} variant="filled" onClose={() => setSnack(null)}>
            {snack.text}
          </Alert>
        ) : undefined}
      </Snackbar>

      <Dialog open={!!pendingDeleteId} onClose={() => setPendingDeleteId(null)}>
        <DialogTitle>Delete "{confirmDelete?.name}"?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This removes the profile and its saved program list. This can't be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingDeleteId(null)}>Cancel</Button>
          <Button
            color="error"
            onClick={() => {
              if (pendingDeleteId) deleteProfile(pendingDeleteId)
              setPendingDeleteId(null)
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </ThemeProvider>
  )
}
