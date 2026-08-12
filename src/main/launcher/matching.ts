import path from 'path'
import type { ProgramEntry } from '@shared/types'

/**
 * The name to match this entry against the running-process list. Uses the
 * user's manual override when set (needed on macOS, where the running
 * process name is the bundle's CFBundleExecutable and doesn't always equal
 * the .app folder name); otherwise derives it from the path's basename.
 */
export function deriveMatchName(entry: Pick<ProgramEntry, 'path' | 'matchName'>): string {
  if (entry.matchName?.trim()) return entry.matchName.trim().toLowerCase()
  // Normalize \ to / before basename-ing so this is deterministic regardless
  // of which OS actually runs it — path.basename only splits on \ when the
  // active platform is win32, so a Windows-style path passed through the
  // posix implementation (e.g. under test on macOS/Linux) would otherwise
  // come back unsplit.
  const base = path.basename(entry.path.replace(/\\/g, '/'))
  return base.replace(/\.(app|exe)$/i, '').toLowerCase()
}

export function isEntryRunning(
  entry: Pick<ProgramEntry, 'path' | 'matchName'>,
  runningNames: Set<string>
): boolean {
  const target = deriveMatchName(entry)
  for (const name of runningNames) {
    const normalized = name.replace(/\.exe$/i, '')
    if (normalized === target) return true
  }
  return false
}
