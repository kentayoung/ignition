import type { BatchLauncherApi } from './index'

declare global {
  interface Window {
    api: BatchLauncherApi
  }
}
