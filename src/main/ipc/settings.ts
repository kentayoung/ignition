import { ipcMain } from 'electron'
import { IPC, type ThemeMode } from '@shared/types'
import { dataStore } from '../store'

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
}
