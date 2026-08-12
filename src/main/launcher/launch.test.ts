import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { EventEmitter } from 'node:events'

vi.mock('child_process', () => ({ spawn: vi.fn() }))

import { spawn } from 'child_process'
import { spawnDetached } from './launch'

function setPlatform(platform: NodeJS.Platform): void {
  Object.defineProperty(process, 'platform', { value: platform, configurable: true })
}

/** A fake ChildProcess: an EventEmitter with the .unref() spawnDetached calls on success. */
function fakeChild(): EventEmitter & { unref: () => void } {
  const child = new EventEmitter() as EventEmitter & { unref: () => void }
  child.unref = vi.fn()
  return child
}

describe('spawnDetached', () => {
  const originalPlatform = process.platform

  beforeEach(() => {
    vi.mocked(spawn).mockReset()
  })

  afterEach(() => {
    setPlatform(originalPlatform)
  })

  it('spawns a Windows .exe directly with its args, cwd set to the exe directory', async () => {
    setPlatform('win32')
    const child = fakeChild()
    vi.mocked(spawn).mockReturnValue(child as never)

    const result = spawnDetached({
      path: 'C:\\Program Files\\RaceLab\\RaceLab.exe',
      args: ['--minimized']
    })
    await Promise.resolve() // let the setImmediate in spawnDetached run
    await new Promise((r) => setImmediate(r))

    expect(spawn).toHaveBeenCalledWith(
      'C:\\Program Files\\RaceLab\\RaceLab.exe',
      ['--minimized'],
      expect.objectContaining({
        detached: true,
        stdio: 'ignore',
        // path.dirname normalizes separators (see launch.ts) — on an actual
        // Windows host this comes back \-separated via path.win32.dirname;
        // functionally equivalent either way as a cwd value.
        cwd: 'C:/Program Files/RaceLab'
      })
    )
    expect(await result).toEqual({ ok: true })
    expect(child.unref).toHaveBeenCalled()
  })

  it('spawns a macOS .app bundle via `open -a`, with no cwd override', async () => {
    setPlatform('darwin')
    const child = fakeChild()
    vi.mocked(spawn).mockReturnValue(child as never)

    const result = spawnDetached({ path: '/Applications/Discord.app' })
    await new Promise((r) => setImmediate(r))

    expect(spawn).toHaveBeenCalledWith(
      'open',
      ['-a', '/Applications/Discord.app'],
      expect.objectContaining({ detached: true, stdio: 'ignore', cwd: undefined })
    )
    expect(await result).toEqual({ ok: true })
  })

  it('passes args to a macOS .app via `open -a <path> --args ...`', async () => {
    setPlatform('darwin')
    const child = fakeChild()
    vi.mocked(spawn).mockReturnValue(child as never)

    spawnDetached({ path: '/Applications/RaceLab.app', args: ['--minimized', '--profile=oval'] })
    await new Promise((r) => setImmediate(r))

    expect(spawn).toHaveBeenCalledWith(
      'open',
      ['-a', '/Applications/RaceLab.app', '--args', '--minimized', '--profile=oval'],
      expect.anything()
    )
  })

  it('spawns a plain unix binary directly (not via open), same as Windows', async () => {
    setPlatform('darwin')
    const child = fakeChild()
    vi.mocked(spawn).mockReturnValue(child as never)

    spawnDetached({ path: '/usr/local/bin/crewchief' })
    await new Promise((r) => setImmediate(r))

    expect(spawn).toHaveBeenCalledWith(
      '/usr/local/bin/crewchief',
      [],
      expect.objectContaining({ cwd: '/usr/local/bin' })
    )
  })

  it('resolves ok:false with a message if spawn throws synchronously', async () => {
    setPlatform('win32')
    vi.mocked(spawn).mockImplementation(() => {
      throw new Error('ENOENT: no such file')
    })

    const result = await spawnDetached({ path: 'C:\\gone\\ghost.exe' })
    expect(result).toEqual({ ok: false, message: 'ENOENT: no such file' })
  })

  it('resolves ok:false with a message if the child emits an async error before settling', async () => {
    setPlatform('win32')
    const child = fakeChild()
    vi.mocked(spawn).mockReturnValue(child as never)

    const resultPromise = spawnDetached({ path: 'C:\\moved\\app.exe' })
    // Fire the error on the same tick, before spawnDetached's setImmediate resolves it as launched.
    child.emit('error', new Error('spawn ENOENT'))

    expect(await resultPromise).toEqual({ ok: false, message: 'spawn ENOENT' })
    expect(child.unref).not.toHaveBeenCalled()
  })
})
