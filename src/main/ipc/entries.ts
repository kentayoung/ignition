import { ipcMain } from 'electron'
import { IPC, type ProgramEntry } from '@shared/types'
import { dataStore } from '../store'

export function registerEntryHandlers(): void {
  ipcMain.handle(
    IPC.entriesAdd,
    (_e, { profileId, entry }: { profileId: string; entry: Omit<ProgramEntry, 'id'> }) =>
      dataStore.addEntry(profileId, entry)
  )

  ipcMain.handle(
    IPC.entriesRemove,
    (_e, { profileId, entryId }: { profileId: string; entryId: string }) =>
      dataStore.removeEntry(profileId, entryId)
  )

  ipcMain.handle(
    IPC.entriesUpdate,
    (
      _e,
      {
        profileId,
        entryId,
        patch
      }: { profileId: string; entryId: string; patch: Partial<ProgramEntry> }
    ) => dataStore.updateEntry(profileId, entryId, patch)
  )

  ipcMain.handle(
    IPC.entriesReorder,
    (_e, { profileId, orderedIds }: { profileId: string; orderedIds: string[] }) =>
      dataStore.reorderEntries(profileId, orderedIds)
  )
}
