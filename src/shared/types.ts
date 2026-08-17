// Shared between main and renderer — keep this file free of any Node/Electron/DOM-only APIs.

export interface ProgramEntry {
  id: string
  displayName: string
  /** Absolute path: .exe on Windows, .app bundle or unix binary on macOS. */
  path: string
  args?: string[]
  iconDataUrl?: string
  /**
   * Advanced override for "already running" detection. Defaults to the path's
   * basename (minus extension) when unset. Needed on macOS where the running
   * process name is the bundle's CFBundleExecutable and doesn't always match
   * the .app folder name.
   */
  matchName?: string
}

export interface Profile {
  id: string
  name: string
  entries: ProgramEntry[]
  createdAt: number
  updatedAt: number
}

export type ThemeMode = 'light' | 'dark' | 'system'

export interface AppSettings {
  themeMode: ThemeMode
  autoCheckForUpdates: boolean
  launchOnStartup: boolean
  /** Seconds to wait after login before showing the window. Only applied when launchOnStartup is on. */
  launchOnStartupDelaySeconds: number
}

export type UpdateCheckStatus = 'up-to-date' | 'update-available' | 'error'

export interface UpdateCheckResult {
  status: UpdateCheckStatus
  currentVersion: string
  latestVersion?: string
  releaseUrl?: string
  message?: string
}

export interface AppData {
  schemaVersion: 1
  profiles: Profile[]
  activeProfileId: string | null
  settings: AppSettings
}

export type LaunchStatus = 'launched' | 'skipped-running' | 'error'

export interface LaunchResult {
  entryId: string
  status: LaunchStatus
  message?: string
}

/** IPC channel names, centralized so main/preload/renderer never hand-type a string twice. */
export const IPC = {
  profilesList: 'profiles:list',
  profilesCreate: 'profiles:create',
  profilesRename: 'profiles:rename',
  profilesDelete: 'profiles:delete',
  profilesSetActive: 'profiles:setActive',

  entriesAdd: 'entries:add',
  entriesRemove: 'entries:remove',
  entriesUpdate: 'entries:update',
  entriesReorder: 'entries:reorder',

  dialogPickProgram: 'dialog:pickProgram',

  iconsGetForPath: 'icons:getForPath',

  launchProfile: 'launch:profile',
  launchEntry: 'launch:entry',

  statusGetRunning: 'status:getRunning',

  settingsGet: 'settings:get',
  settingsSetThemeMode: 'settings:setThemeMode',
  settingsSetAutoCheckForUpdates: 'settings:setAutoCheckForUpdates',
  settingsSetLaunchOnStartup: 'settings:setLaunchOnStartup',
  settingsSetLaunchOnStartupDelaySeconds: 'settings:setLaunchOnStartupDelaySeconds',

  appGetVersion: 'app:getVersion',

  updatesCheck: 'updates:check',
  updatesOpenLatestRelease: 'updates:openLatestRelease',
  // push-only, main -> renderer (webContents.send / ipcRenderer.on), not an invoke/handle pair
  updatesAvailable: 'updates:available'
} as const
