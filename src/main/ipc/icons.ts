import { ipcMain } from 'electron'
import { IPC } from '@shared/types'
import { getFileIconDataUrl } from '../icons'

/** Backfills icons for entries that predate this feature (or whose extraction failed at add-time). */
export function registerIconHandlers(): void {
  ipcMain.handle(IPC.iconsGetForPath, (_e, { path }: { path: string }) => getFileIconDataUrl(path))
}
