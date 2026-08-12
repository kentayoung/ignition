import { useState } from 'react'
import {
  Box,
  Tabs,
  Tab,
  IconButton,
  Menu,
  MenuItem,
  TextField,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import type { Profile } from '@shared/types'

interface Props {
  profiles: Profile[]
  activeProfileId: string | null
  onSelect: (id: string) => void
  onCreate: (name: string) => void
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
}

export function ProfileTabs({
  profiles,
  activeProfileId,
  onSelect,
  onCreate,
  onRename,
  onDelete
}: Props): JSX.Element {
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null)
  const [menuProfileId, setMenuProfileId] = useState<string | null>(null)
  // Renaming happens in its own Dialog rather than inline in the tab strip —
  // MUI's Tabs clones every child expecting Tab-shaped props (selected state,
  // indicator position, roving focus all keyed off `value`), and swapping a
  // tab's content for a text field fought that badly enough that the field
  // could lose focus the instant it mounted. A Dialog is a separate portal
  // with its own well-tested focus trap, so none of that applies.
  const [renameTarget, setRenameTarget] = useState<Profile | null>(null)
  const [renameValue, setRenameValue] = useState('')

  const openMenu = (e: React.MouseEvent<HTMLElement>, profileId: string): void => {
    e.stopPropagation()
    setMenuAnchor(e.currentTarget)
    setMenuProfileId(profileId)
  }
  const closeMenu = (): void => {
    setMenuAnchor(null)
    setMenuProfileId(null)
  }

  const startRename = (): void => {
    const profile = profiles.find((p) => p.id === menuProfileId)
    closeMenu()
    if (!profile) return
    setRenameValue(profile.name)
    setRenameTarget(profile)
  }

  const commitRename = (): void => {
    const trimmed = renameValue.trim()
    if (renameTarget && trimmed) onRename(renameTarget.id, trimmed)
    setRenameTarget(null)
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', borderBottom: 1, borderColor: 'divider' }}>
      <Tabs
        value={activeProfileId ?? false}
        onChange={(_, val) => onSelect(val)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ flex: 1, minHeight: 48 }}
      >
        {profiles.map((profile) => (
          <Tab
            key={profile.id}
            value={profile.id}
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {profile.name}
                <IconButton
                  size="small"
                  component="span"
                  onClick={(e) => openMenu(e, profile.id)}
                  sx={{ ml: 0.5, opacity: 0.6, '&:hover': { opacity: 1 } }}
                >
                  <MoreVertIcon fontSize="inherit" />
                </IconButton>
              </Box>
            }
          />
        ))}
      </Tabs>
      <Tooltip title="New profile">
        <IconButton onClick={() => onCreate('New Profile')} sx={{ mx: 1 }}>
          <AddIcon />
        </IconButton>
      </Tooltip>

      <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={closeMenu}>
        <MenuItem onClick={startRename}>Rename</MenuItem>
        <MenuItem
          disabled={profiles.length <= 1}
          onClick={() => {
            if (menuProfileId) onDelete(menuProfileId)
            closeMenu()
          }}
        >
          Delete
        </MenuItem>
      </Menu>

      <Dialog
        open={!!renameTarget}
        onClose={() => setRenameTarget(null)}
        // Snappy dialogs skip the (default 225ms) exit transition, which also
        // sidesteps any focus-timing edge cases while it's unmounting.
        transitionDuration={0}
      >
        <DialogTitle>Rename profile</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            margin="dense"
            variant="standard"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename()
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenameTarget(null)}>Cancel</Button>
          <Button onClick={commitRename} disabled={!renameValue.trim()}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
