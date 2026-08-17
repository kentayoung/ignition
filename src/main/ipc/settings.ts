import { ipcMain } from 'electron'
import { IPC, type ThemeMode } from '@shared/types'
import { dataStore } from '../store'
import { syncLoginItemSettings } from '../startup'

export function registerSettingsHandlers(): void {
  ipcMain.handle(IPC.settingsGet, () => dataStore.getSettings())

  ipcMain.handle(IPC.settingsSetThemeMode, (_e, { themeMode }: { themeMode: ThemeMode }) => {
    dataStore.setThemeMode(themeMode)
  })

  ipcMain.handle(
    IPC.settingsSetAutoCheckForUpdates,
    (_e, { autoCheckForUpdates }: { autoCheckForUpdates: boolean }) => {
      dataStore.setAutoCheckForUpdates(autoCheckForUpdates)
    }
  )

  ipcMain.handle(
    IPC.settingsSetLaunchOnStartup,
    (_e, { launchOnStartup }: { launchOnStartup: boolean }) => {
      dataStore.setLaunchOnStartup(launchOnStartup)
      syncLoginItemSettings(dataStore.getSettings())
    }
  )

  ipcMain.handle(
    IPC.settingsSetLaunchOnStartupDelaySeconds,
    (_e, { launchOnStartupDelaySeconds }: { launchOnStartupDelaySeconds: number }) => {
      dataStore.setLaunchOnStartupDelaySeconds(launchOnStartupDelaySeconds)
    }
  )
}
