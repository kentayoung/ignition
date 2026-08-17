import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('electron', () => ({
  app: { setLoginItemSettings: vi.fn(), getLoginItemSettings: vi.fn() }
}))

import { app } from 'electron'
import { syncLoginItemSettings, wasOpenedAtLogin } from './startup'
import type { AppSettings } from '@shared/types'

function setPlatform(platform: NodeJS.Platform): void {
  Object.defineProperty(process, 'platform', { value: platform, configurable: true })
}

const settings = (launchOnStartup: boolean): AppSettings => ({
  themeMode: 'system',
  autoCheckForUpdates: true,
  launchOnStartup,
  launchOnStartupDelaySeconds: 0
})

describe('syncLoginItemSettings', () => {
  const originalPlatform = process.platform

  beforeEach(() => {
    vi.mocked(app.setLoginItemSettings).mockReset()
    vi.mocked(app.getLoginItemSettings).mockReset()
  })

  afterEach(() => {
    setPlatform(originalPlatform)
  })

  it('on darwin, mirrors launchOnStartup with no extra args', () => {
    setPlatform('darwin')
    vi.mocked(app.getLoginItemSettings).mockReturnValue({ openAtLogin: false } as never)

    syncLoginItemSettings(settings(true))

    expect(app.setLoginItemSettings).toHaveBeenCalledWith({ openAtLogin: true })
  })

  it('on win32, mirrors launchOnStartup and tags the launch with the login-detection arg', () => {
    setPlatform('win32')
    vi.mocked(app.getLoginItemSettings).mockReturnValue({ openAtLogin: false } as never)

    syncLoginItemSettings(settings(true))

    expect(app.setLoginItemSettings).toHaveBeenCalledWith({
      openAtLogin: true,
      args: ['--opened-at-login']
    })
  })

  it.each(['darwin', 'win32'] as const)(
    'on %s, skips the native call when the OS is already in sync',
    (platform) => {
      setPlatform(platform)
      vi.mocked(app.getLoginItemSettings).mockReturnValue({ openAtLogin: false } as never)

      syncLoginItemSettings(settings(false))

      expect(app.setLoginItemSettings).not.toHaveBeenCalled()
    }
  )

  it('on linux, does not touch login items (unsupported by Electron)', () => {
    setPlatform('linux')

    syncLoginItemSettings(settings(true))

    expect(app.setLoginItemSettings).not.toHaveBeenCalled()
    expect(app.getLoginItemSettings).not.toHaveBeenCalled()
  })

  it('swallows an error from setLoginItemSettings instead of throwing', () => {
    setPlatform('darwin')
    vi.mocked(app.getLoginItemSettings).mockReturnValue({ openAtLogin: false } as never)
    vi.mocked(app.setLoginItemSettings).mockImplementation(() => {
      throw new Error('not permitted')
    })

    expect(() => syncLoginItemSettings(settings(true))).not.toThrow()
  })
})

describe('wasOpenedAtLogin', () => {
  const originalPlatform = process.platform
  const originalArgv = process.argv

  beforeEach(() => {
    vi.mocked(app.getLoginItemSettings).mockReset()
  })

  afterEach(() => {
    setPlatform(originalPlatform)
    process.argv = originalArgv
  })

  it('on darwin, reflects the OS-reported value', () => {
    setPlatform('darwin')
    vi.mocked(app.getLoginItemSettings).mockReturnValue({ wasOpenedAtLogin: true } as never)

    expect(wasOpenedAtLogin()).toBe(true)
  })

  it('on win32, checks argv for the login-detection arg instead of asking the OS', () => {
    setPlatform('win32')
    process.argv = [...originalArgv, '--opened-at-login']

    expect(wasOpenedAtLogin()).toBe(true)
    expect(app.getLoginItemSettings).not.toHaveBeenCalled()
  })

  it('on win32, is false without the login-detection arg', () => {
    setPlatform('win32')
    process.argv = originalArgv.filter((a) => a !== '--opened-at-login')

    expect(wasOpenedAtLogin()).toBe(false)
  })

  it('on linux, is always false without asking the OS', () => {
    setPlatform('linux')

    expect(wasOpenedAtLogin()).toBe(false)
    expect(app.getLoginItemSettings).not.toHaveBeenCalled()
  })
})
