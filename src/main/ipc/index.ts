import { registerProfileHandlers } from './profiles'
import { registerEntryHandlers } from './entries'
import { registerDialogHandlers } from './dialog'
import { registerLaunchHandlers } from './launch'
import { registerStatusHandlers } from './status'
import { registerSettingsHandlers } from './settings'
import { registerUpdateHandlers } from './updates'
import { registerIconHandlers } from './icons'

export function registerIpcHandlers(): void {
  registerProfileHandlers()
  registerEntryHandlers()
  registerDialogHandlers()
  registerLaunchHandlers()
  registerStatusHandlers()
  registerSettingsHandlers()
  registerUpdateHandlers()
  registerIconHandlers()
}
