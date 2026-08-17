import { contextBridge, ipcRenderer } from 'electron'
import type { IpcRendererEvent } from 'electron'
import {
  IPC,
  type AppSettings,
  type LaunchResult,
  type Profile,
  type ProgramEntry,
  type ThemeMode,
  type UpdateCheckResult
} from '@shared/types'

// Deliberately narrow: only the specific calls the renderer needs are
// exposed, never raw ipcRenderer. Every mutating call returns the updated
// Profile so the renderer can just replace state instead of refetching.
const api = {
  profiles: {
    list: (): Promise<Profile[]> => ipcRenderer.invoke(IPC.profilesList),
    create: (name: string): Promise<Profile> => ipcRenderer.invoke(IPC.profilesCreate, { name }),
    rename: (id: string, name: string): Promise<Profile> =>
      ipcRenderer.invoke(IPC.profilesRename, { id, name }),
    delete: (id: string): Promise<void> => ipcRenderer.invoke(IPC.profilesDelete, { id }),
    setActive: (id: string): Promise<void> => ipcRenderer.invoke(IPC.profilesSetActive, { id })
  },
  entries: {
    add: (profileId: string, entry: Omit<ProgramEntry, 'id'>): Promise<Profile> =>
      ipcRenderer.invoke(IPC.entriesAdd, { profileId, entry }),
    remove: (profileId: string, entryId: string): Promise<Profile> =>
      ipcRenderer.invoke(IPC.entriesRemove, { profileId, entryId }),
    update: (profileId: string, entryId: string, patch: Partial<ProgramEntry>): Promise<Profile> =>
      ipcRenderer.invoke(IPC.entriesUpdate, { profileId, entryId, patch }),
    reorder: (profileId: string, orderedIds: string[]): Promise<Profile> =>
      ipcRenderer.invoke(IPC.entriesReorder, { profileId, orderedIds })
  },
  dialog: {
    pickProgram: (): Promise<{ path: string; suggestedName: string; iconDataUrl?: string } | null> =>
      ipcRenderer.invoke(IPC.dialogPickProgram)
  },
  icons: {
    getForPath: (path: string): Promise<string | undefined> =>
      ipcRenderer.invoke(IPC.iconsGetForPath, { path })
  },
  launch: {
    profile: (profileId: string): Promise<LaunchResult[]> =>
      ipcRenderer.invoke(IPC.launchProfile, { profileId }),
    entry: (profileId: string, entryId: string): Promise<LaunchResult> =>
      ipcRenderer.invoke(IPC.launchEntry, { profileId, entryId })
  },
  status: {
    getRunning: (profileId: string): Promise<Record<string, boolean>> =>
      ipcRenderer.invoke(IPC.statusGetRunning, { profileId })
  },
  settings: {
    get: (): Promise<AppSettings> => ipcRenderer.invoke(IPC.settingsGet),
    setThemeMode: (themeMode: ThemeMode): Promise<void> =>
      ipcRenderer.invoke(IPC.settingsSetThemeMode, { themeMode }),
    setAutoCheckForUpdates: (autoCheckForUpdates: boolean): Promise<void> =>
      ipcRenderer.invoke(IPC.settingsSetAutoCheckForUpdates, { autoCheckForUpdates }),
    setLaunchOnStartup: (launchOnStartup: boolean): Promise<void> =>
      ipcRenderer.invoke(IPC.settingsSetLaunchOnStartup, { launchOnStartup }),
    setLaunchOnStartupDelaySeconds: (launchOnStartupDelaySeconds: number): Promise<void> =>
      ipcRenderer.invoke(IPC.settingsSetLaunchOnStartupDelaySeconds, {
        launchOnStartupDelaySeconds
      })
  },
  app: {
    getVersion: (): Promise<string> => ipcRenderer.invoke(IPC.appGetVersion),
    // Plain value, not IPC — process.platform is available synchronously in preload.
    platform: process.platform
  },
  updates: {
    check: (): Promise<UpdateCheckResult> => ipcRenderer.invoke(IPC.updatesCheck),
    openLatestRelease: (): Promise<void> => ipcRenderer.invoke(IPC.updatesOpenLatestRelease),
    // Main pushes this unprompted (auto-check on launch); returns an unsubscribe fn.
    onAvailable: (callback: (result: UpdateCheckResult) => void): (() => void) => {
      const listener = (_event: IpcRendererEvent, result: UpdateCheckResult): void => callback(result)
      ipcRenderer.on(IPC.updatesAvailable, listener)
      return () => ipcRenderer.removeListener(IPC.updatesAvailable, listener)
    }
  }
}

export type BatchLauncherApi = typeof api

// contextIsolation is always on for this app's windows (see src/main/index.ts), so this
// is the only path — no non-isolated fallback needed.
contextBridge.exposeInMainWorld('api', api)
