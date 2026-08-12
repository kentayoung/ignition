import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('electron', () => ({
  app: { getFileIcon: vi.fn() }
}))

vi.mock('child_process', () => ({
  execFile: vi.fn()
}))

vi.mock('fs/promises', () => ({
  access: vi.fn(),
  readFile: vi.fn(),
  unlink: vi.fn()
}))

import { app } from 'electron'
import { execFile } from 'child_process'
import { access, readFile, unlink } from 'fs/promises'
import { getFileIconDataUrl } from './icons'

type ExecFileCallback = (error: Error | null, result?: { stdout: string; stderr: string }) => void

function setPlatform(platform: NodeJS.Platform): void {
  Object.defineProperty(process, 'platform', { value: platform, configurable: true })
}

function mockExecFileImpl(handlers: Record<string, (args: string[]) => { stdout: string } | Error>): void {
  vi.mocked(execFile).mockImplementation(((cmd: string, args: string[], cb: ExecFileCallback) => {
    const handler = handlers[cmd]
    if (!handler) {
      cb(new Error(`unexpected command: ${cmd}`))
      return undefined as never
    }
    const result = handler(args)
    if (result instanceof Error) cb(result)
    else cb(null, { stdout: result.stdout, stderr: '' })
    return undefined as never
  }) as never)
}

describe('getFileIconDataUrl', () => {
  const originalPlatform = process.platform

  beforeEach(() => {
    vi.mocked(app.getFileIcon).mockReset()
    vi.mocked(execFile).mockReset()
    vi.mocked(access).mockReset().mockResolvedValue(undefined)
    vi.mocked(readFile).mockReset()
    vi.mocked(unlink).mockReset().mockResolvedValue(undefined)
  })

  afterEach(() => {
    setPlatform(originalPlatform)
  })

  it('returns undefined without calling anything else if the path does not exist', async () => {
    vi.mocked(access).mockRejectedValue(new Error('ENOENT'))

    const result = await getFileIconDataUrl('/Applications/Ghost.app')

    expect(result).toBeUndefined()
    expect(execFile).not.toHaveBeenCalled()
    expect(app.getFileIcon).not.toHaveBeenCalled()
  })

  it('on macOS, resolves a .app icon via plutil + sips and never falls back to app.getFileIcon', async () => {
    setPlatform('darwin')
    mockExecFileImpl({
      plutil: () => ({ stdout: 'AppIcon\n' }),
      sips: () => ({ stdout: '' })
    })
    vi.mocked(readFile).mockResolvedValue(Buffer.from('fake-png-bytes'))

    const result = await getFileIconDataUrl('/Applications/Discord.app')

    expect(result).toBe(`data:image/png;base64,${Buffer.from('fake-png-bytes').toString('base64')}`)
    expect(app.getFileIcon).not.toHaveBeenCalled()
    // plutil asked about the right Info.plist
    expect(execFile).toHaveBeenCalledWith(
      'plutil',
      expect.arrayContaining(['/Applications/Discord.app/Contents/Info.plist']),
      expect.any(Function)
    )
  })

  it('appends .icns when CFBundleIconFile has no extension', async () => {
    setPlatform('darwin')
    mockExecFileImpl({
      plutil: () => ({ stdout: 'AppIcon' }), // no .icns suffix
      sips: (args) => {
        expect(args).toContain('/Applications/Discord.app/Contents/Resources/AppIcon.icns')
        return { stdout: '' }
      }
    })
    vi.mocked(readFile).mockResolvedValue(Buffer.from('x'))

    await getFileIconDataUrl('/Applications/Discord.app')
  })

  it('falls back to app.getFileIcon when plutil fails (no CFBundleIconFile key)', async () => {
    setPlatform('darwin')
    mockExecFileImpl({
      plutil: () => new Error('key not found')
    })
    vi.mocked(app.getFileIcon).mockResolvedValue({
      isEmpty: () => false,
      toDataURL: () => 'data:image/png;base64,FALLBACK'
    } as never)

    const result = await getFileIconDataUrl('/Applications/Weird.app')

    expect(result).toBe('data:image/png;base64,FALLBACK')
    expect(app.getFileIcon).toHaveBeenCalledWith('/Applications/Weird.app', { size: 'normal' })
  })

  it('falls back to app.getFileIcon when the resolved .icns file does not exist', async () => {
    setPlatform('darwin')
    mockExecFileImpl({ plutil: () => ({ stdout: 'AppIcon.icns' }) })
    // First access() call (the top-level file-exists check) succeeds; the second
    // (the icns path inside getMacAppIconDataUrl) fails.
    vi.mocked(access).mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('ENOENT'))
    vi.mocked(app.getFileIcon).mockResolvedValue({
      isEmpty: () => false,
      toDataURL: () => 'data:image/png;base64,FALLBACK'
    } as never)

    const result = await getFileIconDataUrl('/Applications/Weird.app')

    expect(result).toBe('data:image/png;base64,FALLBACK')
  })

  it('on Windows, resolves an exe icon via PowerShell ExtractAssociatedIcon and never falls back to app.getFileIcon', async () => {
    setPlatform('win32')
    mockExecFileImpl({
      'powershell.exe': () => ({ stdout: '' })
    })
    vi.mocked(readFile).mockResolvedValue(Buffer.from('windows-icon-bytes'))

    const result = await getFileIconDataUrl('C:\\Program Files\\RaceLab\\RaceLab.exe')

    expect(result).toBe(`data:image/png;base64,${Buffer.from('windows-icon-bytes').toString('base64')}`)
    expect(app.getFileIcon).not.toHaveBeenCalled()
    expect(execFile).toHaveBeenCalledWith(
      'powershell.exe',
      expect.arrayContaining(['-Command']),
      expect.any(Function)
    )
  })

  it('falls back to app.getFileIcon when the PowerShell icon extraction fails', async () => {
    setPlatform('win32')
    mockExecFileImpl({}) // any command errors -> getWindowsExeIconDataUrl swallows it and returns undefined
    vi.mocked(app.getFileIcon).mockResolvedValue({
      isEmpty: () => false,
      toDataURL: () => 'data:image/png;base64,WINDOWS'
    } as never)

    const result = await getFileIconDataUrl('C:\\Program Files\\RaceLab\\RaceLab.exe')

    expect(result).toBe('data:image/png;base64,WINDOWS')
    expect(app.getFileIcon).toHaveBeenCalledWith('C:\\Program Files\\RaceLab\\RaceLab.exe', { size: 'normal' })
  })

  it('returns undefined when both the PowerShell path and app.getFileIcon fail to produce an icon', async () => {
    setPlatform('win32')
    mockExecFileImpl({})
    vi.mocked(app.getFileIcon).mockResolvedValue({ isEmpty: () => true, toDataURL: () => '' } as never)

    const result = await getFileIconDataUrl('C:\\gone.exe')

    expect(result).toBeUndefined()
  })

  it('returns undefined instead of throwing if app.getFileIcon itself rejects', async () => {
    setPlatform('win32')
    mockExecFileImpl({})
    vi.mocked(app.getFileIcon).mockRejectedValue(new Error('boom'))

    await expect(getFileIconDataUrl('C:\\weird.exe')).resolves.toBeUndefined()
  })
})
