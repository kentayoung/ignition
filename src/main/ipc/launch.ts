import { ipcMain } from 'electron'
import { IPC, type LaunchResult, type Profile, type ProgramEntry } from '@shared/types'
import { dataStore } from '../store'
import { spawnDetached } from '../launcher/launch'
import { isEntryRunning } from '../launcher/matching'
import { getRunningProcessNames } from '../processStatus'

function findEntry(profile: Profile, entryId: string): ProgramEntry {
  const entry = profile.entries.find((e) => e.id === entryId)
  if (!entry) throw new Error(`Entry not found: ${entryId}`)
  return entry
}

async function launchOne(entry: ProgramEntry, runningNames: Set<string>): Promise<LaunchResult> {
  if (isEntryRunning(entry, runningNames)) {
    return { entryId: entry.id, status: 'skipped-running' }
  }
  const result = await spawnDetached(entry)
  return result.ok
    ? { entryId: entry.id, status: 'launched' }
    : { entryId: entry.id, status: 'error', message: result.message }
}

export function registerLaunchHandlers(): void {
  ipcMain.handle(IPC.launchProfile, async (_e, { profileId }: { profileId: string }) => {
    const profile = dataStore.listProfiles().find((p) => p.id === profileId)
    if (!profile) throw new Error(`Profile not found: ${profileId}`)

    // Snapshot the running-process list once per click, not once per entry.
    const runningNames = await getRunningProcessNames()

    const results: LaunchResult[] = []
    for (const entry of profile.entries) {
      results.push(await launchOne(entry, runningNames))
    }
    return results
  })

  ipcMain.handle(
    IPC.launchEntry,
    async (_e, { profileId, entryId }: { profileId: string; entryId: string }) => {
      const profile = dataStore.listProfiles().find((p) => p.id === profileId)
      if (!profile) throw new Error(`Profile not found: ${profileId}`)
      const entry = findEntry(profile, entryId)
      const runningNames = await getRunningProcessNames()
      return launchOne(entry, runningNames)
    }
  )
}
