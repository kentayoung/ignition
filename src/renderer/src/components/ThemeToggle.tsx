import { IconButton, Menu, MenuItem, ListItemIcon, ListItemText, Tooltip } from '@mui/material'
import { useState } from 'react'
import LightModeIcon from '@mui/icons-material/LightMode'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import SettingsBrightnessIcon from '@mui/icons-material/SettingsBrightness'
import CheckIcon from '@mui/icons-material/Check'
import type { ThemeMode } from '@shared/types'

interface Props {
  mode: ThemeMode
  resolved: 'light' | 'dark'
  onChange: (mode: ThemeMode) => void
}

const OPTIONS: { value: ThemeMode; label: string; icon: JSX.Element }[] = [
  { value: 'system', label: 'Match system', icon: <SettingsBrightnessIcon fontSize="small" /> },
  { value: 'light', label: 'Light', icon: <LightModeIcon fontSize="small" /> },
  { value: 'dark', label: 'Dark', icon: <DarkModeIcon fontSize="small" /> }
]

export function ThemeToggle({ mode, resolved, onChange }: Props): JSX.Element {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null)

  return (
    <>
      <Tooltip title="Theme">
        <IconButton onClick={(e) => setAnchor(e.currentTarget)} color="inherit">
          {resolved === 'dark' ? <DarkModeIcon /> : <LightModeIcon />}
        </IconButton>
      </Tooltip>
      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
        {OPTIONS.map((opt) => (
          <MenuItem
            key={opt.value}
            selected={mode === opt.value}
            onClick={() => {
              onChange(opt.value)
              setAnchor(null)
            }}
          >
            <ListItemIcon>{opt.icon}</ListItemIcon>
            <ListItemText>{opt.label}</ListItemText>
            {mode === opt.value && (
              <ListItemIcon sx={{ minWidth: 24, justifyContent: 'flex-end' }}>
                <CheckIcon fontSize="small" />
              </ListItemIcon>
            )}
          </MenuItem>
        ))}
      </Menu>
    </>
  )
}
