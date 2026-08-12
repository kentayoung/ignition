import { ipcMain } from 'electron'
import { IPC } from '@shared/types'
import { dataStore } from '../store'
import { isEntryRunning } from '../launcher/matching'
import { getRunningProcessNames } from '../processStatus'

export function registerStatusHandlers(): void {
  ipcMain.handle(IPC.statusGetRunning, async (_e, { profileId }: { profileId: string }) => {
    const profile = dataStore.listProfiles().find((p) => p.id === profileId)
    if (!profile) return {}

    const runningNames = await getRunningProcessNames()
    const status: Record<string, boolean> = {}
    for (const entry of profile.entries) {
      status[entry.id] = isEntryRunning(entry, runningNames)
    }
    return status
  })
}
