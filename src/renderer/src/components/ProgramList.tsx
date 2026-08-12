import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove
} from '@dnd-kit/sortable'
import { List, Box, Typography } from '@mui/material'
import AppsIcon from '@mui/icons-material/Apps'
import type { ProgramEntry } from '@shared/types'
import { ProgramRow } from './ProgramRow'

interface Props {
  entries: ProgramEntry[]
  runningStatus: Record<string, boolean>
  onReorder: (orderedIds: string[]) => void
  onRemove: (entryId: string) => void
  onLaunchOne: (entryId: string) => void
  onIconResolved: (entryId: string, iconDataUrl: string) => void
}

export function ProgramList({
  entries,
  runningStatus,
  onReorder,
  onRemove,
  onLaunchOne,
  onIconResolved
}: Props): JSX.Element {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  if (entries.length === 0) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1.5,
          py: 8,
          color: 'text.secondary'
        }}
      >
        <AppsIcon sx={{ fontSize: 48, opacity: 0.4 }} />
        <Typography variant="body1">No programs in this profile yet</Typography>
        <Typography variant="body2" sx={{ opacity: 0.7 }}>
          Use "Add Program" below to pick an executable to launch.
        </Typography>
      </Box>
    )
  }

  const handleDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = entries.findIndex((e) => e.id === active.id)
    const newIndex = entries.findIndex((e) => e.id === over.id)
    const reordered = arrayMove(entries, oldIndex, newIndex)
    onReorder(reordered.map((e) => e.id))
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={entries.map((e) => e.id)} strategy={verticalListSortingStrategy}>
        <List sx={{ py: 0 }}>
          {entries.map((entry) => (
            <ProgramRow
              key={entry.id}
              entry={entry}
              isRunning={runningStatus[entry.id]}
              onRemove={() => onRemove(entry.id)}
              onLaunchOne={() => onLaunchOne(entry.id)}
              onIconResolved={(iconDataUrl) => onIconResolved(entry.id, iconDataUrl)}
            />
          ))}
        </List>
      </SortableContext>
    </DndContext>
  )
}
