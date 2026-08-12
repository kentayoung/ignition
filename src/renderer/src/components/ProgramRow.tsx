import { useEffect } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Avatar,
  Chip,
  Tooltip,
  Box
} from '@mui/material'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import TerminalIcon from '@mui/icons-material/Terminal'
import type { ProgramEntry } from '@shared/types'

interface Props {
  entry: ProgramEntry
  isRunning?: boolean
  onRemove: () => void
  onLaunchOne: () => void
  /** Fires once an icon is resolved for an entry that didn't already have one (backfill). */
  onIconResolved: (iconDataUrl: string) => void
}

export function ProgramRow({ entry, isRunning, onRemove, onLaunchOne, onIconResolved }: Props): JSX.Element {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: entry.id
  })

  // Backfill for entries added before icon extraction existed (or where it
  // failed at add-time, e.g. a transient fs hiccup) — fetch once, lazily.
  useEffect(() => {
    if (entry.iconDataUrl) return
    let cancelled = false
    window.api.icons.getForPath(entry.path).then((iconDataUrl) => {
      if (!cancelled && iconDataUrl) onIconResolved(iconDataUrl)
    })
    return () => {
      cancelled = true
    }
    // Only re-run if the entry's own icon state changes (e.g. path edited later), not on every parent render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry.id, entry.path, entry.iconDataUrl])

  return (
    <ListItem
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      sx={{
        mb: 1,
        bgcolor: 'background.paper',
        boxShadow: isDragging ? 4 : 1,
        opacity: isDragging ? 0.85 : 1
      }}
      secondaryAction={
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="Launch just this one">
            <IconButton edge="end" onClick={onLaunchOne}>
              <PlayArrowIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Remove from profile">
            <IconButton edge="end" onClick={onRemove}>
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      }
    >
      <ListItemIcon
        {...attributes}
        {...listeners}
        sx={{ cursor: 'grab', minWidth: 36, color: 'text.disabled' }}
      >
        <DragIndicatorIcon />
      </ListItemIcon>
      <Avatar
        variant="rounded"
        src={entry.iconDataUrl}
        sx={{ width: 32, height: 32, mr: 1.5, bgcolor: 'action.selected' }}
      >
        <TerminalIcon fontSize="small" />
      </Avatar>
      <ListItemText
        primary={entry.displayName}
        secondary={entry.path}
        secondaryTypographyProps={{
          noWrap: true,
          sx: { fontFamily: 'monospace', fontSize: '0.75rem' }
        }}
      />
      {isRunning && <Chip label="Running" size="small" color="success" sx={{ mr: 6 }} />}
    </ListItem>
  )
}
