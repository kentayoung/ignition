import { useEffect, useMemo, useState } from 'react'
import type { ThemeMode } from '@shared/types'

/**
 * Resolves the effective light/dark palette from a persisted 'system' | 'light' | 'dark'
 * preference. 'system' follows the OS via prefers-color-scheme and updates live if the OS
 * theme changes while the app is open.
 */
export function useThemeMode(): {
  mode: ThemeMode
  resolved: 'light' | 'dark'
  setMode: (mode: ThemeMode) => void
} {
  const [mode, setModeState] = useState<ThemeMode>('system')
  const [systemPrefersDark, setSystemPrefersDark] = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches
  )

  useEffect(() => {
    window.api.settings.get().then((settings) => setModeState(settings.themeMode))
  }, [])

  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const listener = (e: MediaQueryListEvent): void => setSystemPrefersDark(e.matches)
    mql.addEventListener('change', listener)
    return () => mql.removeEventListener('change', listener)
  }, [])

  const setMode = (next: ThemeMode): void => {
    setModeState(next)
    void window.api.settings.setThemeMode(next)
  }

  const resolved = useMemo<'light' | 'dark'>(() => {
    if (mode === 'system') return systemPrefersDark ? 'dark' : 'light'
    return mode
  }, [mode, systemPrefersDark])

  return { mode, resolved, setMode }
}
