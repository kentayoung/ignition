import { dialog, shell, BrowserWindow } from 'electron'
import path from 'path'
import { readFile } from 'fs/promises'
import { getFileIconDataUrl } from './icons'
import { toSquirrelLaunch } from './launcher/squirrel'

export interface PickedProgram {
  path: string
  suggestedName: string
  args?: string[]
  matchName?: string
  iconDataUrl?: string
}

/** Main-process only — dialog is not exposed to the renderer, this is the sole entry point. */
export async function pickProgram(win: BrowserWindow): Promise<PickedProgram | null> {
  const filters =
    process.platform === 'win32'
      ? [{ name: 'Programs and shortcuts', extensions: ['exe', 'lnk', 'url'] }]
      : [
          { name: 'Applications', extensions: ['app'] },
          { name: 'All Files', extensions: ['*'] }
        ]

  const result = await dialog.showOpenDialog(win, {
    title: 'Choose a program',
    defaultPath:
      process.platform === 'win32' && process.env.ProgramData
        ? path.join(process.env.ProgramData, 'Microsoft', 'Windows', 'Start Menu', 'Programs')
        : undefined,
    properties: ['openFile'],
    filters
  })

  if (result.canceled || !result.filePaths[0]) return null

  let filePath = result.filePaths[0]
  const suggestedName = path.basename(filePath, path.extname(filePath))
  let args: string[] | undefined
  let matchName: string | undefined

  if (process.platform === 'win32' && path.extname(filePath).toLowerCase() === '.url') {
    const text = await readFile(filePath, 'utf8').catch(() => '')
    const url = /^URL=(.+)$/m.exec(text)?.[1].trim()
    if (!url) return null
    const iconFile = /^IconFile=(.+)$/m.exec(text)?.[1].trim()
    return {
      path: url,
      suggestedName,
      iconDataUrl:
        (iconFile && (await getFileIconDataUrl(iconFile))) || (await getFileIconDataUrl(filePath))
    }
  }

  if (process.platform === 'win32') {
    if (path.extname(filePath).toLowerCase() === '.lnk') {
      try {
        const link = shell.readShortcutLink(filePath)
        filePath = link.target
        if (link.args) args = [link.args]
      } catch {
        return null
      }
    }
    const stable = toSquirrelLaunch({ path: filePath, args })
    if (stable) {
      filePath = stable.path
      args = stable.args
      matchName = stable.matchName
    }
  }

  return {
    path: filePath,
    suggestedName,
    args,
    matchName,
    iconDataUrl: await getFileIconDataUrl(filePath)
  }
}
