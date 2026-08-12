import { ipcMain, BrowserWindow } from 'electron'
import { IPC } from '@shared/types'
import { pickProgram } from '../dialogs'

export function registerDialogHandlers(): void {
  ipcMain.handle(IPC.dialogPickProgram, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return null
    return pickProgram(win)
  })
}
