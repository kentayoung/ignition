import { spawn } from 'child_process'
import path from 'path'
import type { ProgramEntry } from '@shared/types'

/**
 * Spawns the target detached so it survives the launcher window closing.
 * - Windows: spawn the .exe directly with an args array (never shell:true —
 *   avoids quoting issues with paths like "C:\Program Files\...").
 * - macOS: a .app is a bundle *directory*, not a binary — spawned via
 *   `open -a <path> [--args ...]` rather than reaching into Contents/MacOS,
 *   which preserves normal LaunchServices/bundle-activation behavior. Plain
 *   unix binaries (not .app) spawn directly, same as Windows.
 *
 * Not handled here (by design, v1 scope): Windows UAC elevation prompts and
 * macOS Gatekeeper prompts for unsigned apps both surface as an OS-level
 * dialog on first run, or a silent spawn failure — documented in the README
 * rather than solved in code.
 */
export function spawnDetached(
  entry: Pick<ProgramEntry, 'path' | 'args'>
): Promise<{ ok: true } | { ok: false; message: string }> {
  const isMacApp = process.platform === 'darwin' && path.extname(entry.path) === '.app'

  const cmd = isMacApp ? 'open' : entry.path
  const args = isMacApp
    ? entry.args?.length
      ? ['-a', entry.path, '--args', ...entry.args]
      : ['-a', entry.path]
    : (entry.args ?? [])

  return new Promise((resolve) => {
    let settled = false
    let child: ReturnType<typeof spawn>
    try {
      child = spawn(cmd, args, {
        detached: true,
        stdio: 'ignore',
        // Many sim-racing tools resolve config files relative to their own
        // exe directory; skip cwd override for the mac bundle case (`open`
        // handles activation itself).
        // \ normalized to / first: path.dirname only splits on \ when the
        // *actual* runtime platform is win32 (it's a static binding, not a
        // per-call check of process.platform), so this keeps behavior correct
        // and deterministic under test regardless of which OS runs it.
        cwd: isMacApp ? undefined : path.dirname(entry.path.replace(/\\/g, '/'))
      })
    } catch (err) {
      resolve({ ok: false, message: (err as Error).message })
      return
    }

    // A bad path (e.g. the exe moved/uninstalled) surfaces as an async
    // 'error' event, not a synchronous throw — catch it before detaching.
    child.once('error', (err) => {
      if (settled) return
      settled = true
      resolve({ ok: false, message: err.message })
    })

    // Give the 'error' event a tick to fire before we consider it launched.
    setImmediate(() => {
      if (settled) return
      settled = true
      child.unref()
      resolve({ ok: true })
    })
  })
}
