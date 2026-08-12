import { dialog, BrowserWindow } from 'electron'
import path from 'path'
import { getFileIconDataUrl } from './icons'

export interface PickedProgram {
  path: string
  suggestedName: string
  iconDataUrl?: string
}

/** Main-process only — dialog is not exposed to the renderer, this is the sole entry point. */
export async function pickProgram(win: BrowserWindow): Promise<PickedProgram | null> {
  const filters =
    process.platform === 'win32'
      ? [{ name: 'Executables', extensions: ['exe'] }]
      : [
          { name: 'Applications', extensions: ['app'] },
          { name: 'All Files', extensions: ['*'] }
        ]

  const result = await dialog.showOpenDialog(win, {
    title: 'Choose a program',
    properties: ['openFile'],
    filters
  })

  if (result.canceled || !result.filePaths[0]) return null

  const filePath = result.filePaths[0]
  return {
    path: filePath,
    suggestedName: path.basename(filePath, path.extname(filePath)),
    iconDataUrl: await getFileIconDataUrl(filePath)
  }
}
