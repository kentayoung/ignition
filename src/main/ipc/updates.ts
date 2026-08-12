import { ipcMain, shell, app, BrowserWindow } from 'electron'
import { IPC } from '@shared/types'
import { checkForUpdate, getLastKnownReleaseUrl } from '../updates'
import { dataStore } from '../store'

export function registerUpdateHandlers(): void {
  ipcMain.handle(IPC.appGetVersion, () => app.getVersion())

  ipcMain.handle(IPC.updatesCheck, () => checkForUpdate())

  ipcMain.handle(IPC.updatesOpenLatestRelease, () => {
    const url = getLastKnownReleaseUrl()
    if (url) shell.openExternal(url)
  })
}

/** Runs once after the window is ready; only pushes a notification if a newer release exists. */
export async function autoCheckForUpdatesOnLaunch(win: BrowserWindow): Promise<void> {
  if (!dataStore.getSettings().autoCheckForUpdates) return
  const result = await checkForUpdate()
  if (result.status === 'update-available' && !win.isDestroyed()) {
    win.webContents.send(IPC.updatesAvailable, result)
  }
}
