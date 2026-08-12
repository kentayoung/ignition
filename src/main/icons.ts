import { app } from 'electron'
import { access, readFile, unlink } from 'fs/promises'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { tmpdir } from 'os'
import { join, extname, posix } from 'path'
import { randomUUID } from 'crypto'

const execFileAsync = promisify(execFile)

/**
 * macOS-specific path: Electron's built-in .icns decoder (used by both
 * nativeImage.createFromPath and app.getFileIcon/NSWorkspace under the hood)
 * fails on modern multi-representation .icns files and silently falls back
 * to a generic placeholder icon — confirmed by extracting Discord.app's,
 * Contacts.app's, and VS Code's icons and getting byte-identical generic
 * output for all three. `sips` (a macOS system tool, already used in
 * build/icon.png tooling) decodes the same files correctly, so shell out to
 * it instead: resolve the bundle's CFBundleIconFile from Info.plist, then
 * convert that .icns to PNG.
 */
async function getMacAppIconDataUrl(appPath: string): Promise<string | undefined> {
  try {
    // appPath is always a macOS (forward-slash) path — path.posix.join keeps
    // that deterministic under test regardless of which OS actually runs it,
    // unlike the ambient join() below, which is host-platform-bound (same
    // class of issue fixed in matching.ts/launch.ts). tmpPng further down
    // stays on the ambient join since tmpdir() is a genuinely host-native path.
    const plistPath = posix.join(appPath, 'Contents', 'Info.plist')
    const { stdout } = await execFileAsync('plutil', [
      '-extract',
      'CFBundleIconFile',
      'raw',
      '-o',
      '-',
      plistPath
    ])
    let iconFile = stdout.trim()
    if (!iconFile) return undefined
    if (!/\.icns$/i.test(iconFile)) iconFile += '.icns'

    const icnsPath = posix.join(appPath, 'Contents', 'Resources', iconFile)
    await access(icnsPath)

    const tmpPng = join(tmpdir(), `ignition-icon-${randomUUID()}.png`)
    try {
      // Cap at 64px (2x the 32px Avatar) — sharp enough for HiDPI without
      // bloating the JSON store every icon ends up persisted in.
      await execFileAsync('sips', [
        '-s',
        'format',
        'png',
        icnsPath,
        '--resampleHeightWidthMax',
        '64',
        '--out',
        tmpPng
      ])
      const buf = await readFile(tmpPng)
      return `data:image/png;base64,${buf.toString('base64')}`
    } finally {
      unlink(tmpPng).catch(() => {})
    }
  } catch {
    return undefined
  }
}

/**
 * Windows-specific path: Electron's built-in app.getFileIcon (SHGetFileInfo
 * under the hood) has a blind spot for some real executables' icon
 * resources and silently falls back to the generic "blank document" icon —
 * confirmed by extracting MOZA Pit House.exe's and Trading Paints.exe's
 * icons and getting byte-identical generic output for both, despite each
 * carrying its own distinct icon. .NET's Icon.ExtractAssociatedIcon (a
 * different Win32 API, ExtractIconEx/PrivateExtractIcons) resolves both
 * correctly, so shell out to a PowerShell one-liner using that instead of
 * relying solely on app.getFileIcon — same rationale as the macOS path above.
 */
async function getWindowsExeIconDataUrl(exePath: string): Promise<string | undefined> {
  const tmpPng = join(tmpdir(), `ignition-icon-${randomUUID()}.png`)
  try {
    const escapedExe = exePath.replace(/'/g, "''")
    const escapedOut = tmpPng.replace(/'/g, "''")
    const script = [
      'Add-Type -AssemblyName System.Drawing;',
      `$icon = [System.Drawing.Icon]::ExtractAssociatedIcon('${escapedExe}');`,
      'if ($null -eq $icon) { exit 1 };',
      '$bmp = $icon.ToBitmap();',
      `$bmp.Save('${escapedOut}', [System.Drawing.Imaging.ImageFormat]::Png);`
    ].join(' ')

    await execFileAsync('powershell.exe', [
      '-NoProfile',
      '-NonInteractive',
      '-ExecutionPolicy',
      'Bypass',
      '-Command',
      script
    ])

    const buf = await readFile(tmpPng)
    return `data:image/png;base64,${buf.toString('base64')}`
  } catch {
    return undefined
  } finally {
    unlink(tmpPng).catch(() => {})
  }
}

/**
 * Extracts the OS-associated icon for a program path as a data URL. macOS
 * .app bundles and Windows .exe files go through the platform-specific
 * paths above; anything else (Linux binaries, or either platform path
 * failing) falls back to Electron's built-in app.getFileIcon.
 */
export async function getFileIconDataUrl(filePath: string): Promise<string | undefined> {
  try {
    await access(filePath)

    if (process.platform === 'darwin' && extname(filePath).toLowerCase() === '.app') {
      const macIcon = await getMacAppIconDataUrl(filePath)
      if (macIcon) return macIcon
    }

    if (process.platform === 'win32') {
      const winIcon = await getWindowsExeIconDataUrl(filePath)
      if (winIcon) return winIcon
    }

    const image = await app.getFileIcon(filePath, { size: 'normal' })
    return image.isEmpty() ? undefined : image.toDataURL()
  } catch {
    // Missing/moved file, or a platform that can't resolve an icon for it —
    // the UI just falls back to its generic icon, not worth surfacing as an error.
    return undefined
  }
}
