import { app } from 'electron'
import type { AppSettings } from '@shared/types'

// No login-item support on Linux.
function supportsLoginItems(): boolean {
  return process.platform === 'darwin' || process.platform === 'win32'
}

// Windows has no wasOpenedAtLogin — tag the login-item launch with this arg and check argv instead.
const LOGIN_ARG = '--opened-at-login'
// Function, not a module-level constant: process.platform can change under test.
function loginItemQuery(): { args?: string[] } {
  return process.platform === 'win32' ? { args: [LOGIN_ARG] } : {}
}

/** Mirrors the persisted launchOnStartup setting into the OS's actual login items. */
export function syncLoginItemSettings(settings: AppSettings): void {
  if (!supportsLoginItems()) return
  // Skip the native call when nothing would change (also dodges a permission error on unsigned builds).
  if (app.getLoginItemSettings(loginItemQuery()).openAtLogin === settings.launchOnStartup) return
  try {
    app.setLoginItemSettings({ openAtLogin: settings.launchOnStartup, ...loginItemQuery() })
  } catch (err) {
    // Non-fatal: e.g. macOS refusing writes for an unsigned build. Don't take the app down.
    console.error('Failed to sync login item settings:', err)
  }
}

/** True when this launch was the OS opening us as a login item, not a manual/dev launch. */
export function wasOpenedAtLogin(): boolean {
  if (!supportsLoginItems()) return false
  if (process.platform === 'win32') return process.argv.includes(LOGIN_ARG)
  return app.getLoginItemSettings().wasOpenedAtLogin ?? false
}
