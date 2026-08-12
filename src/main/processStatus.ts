// ps-list is pure ESM; main process here builds as CJS, so it's loaded via a
// cached dynamic import rather than a static one.
type PsListFn = typeof import('ps-list').default

let psListPromise: Promise<PsListFn> | null = null
function loadPsList(): Promise<PsListFn> {
  if (!psListPromise) {
    psListPromise = import('ps-list').then((mod) => mod.default)
  }
  return psListPromise
}

/** Lowercased set of running process names (no extension stripping — callers normalize). */
export async function getRunningProcessNames(): Promise<Set<string>> {
  const psList = await loadPsList()
  const procs = await psList()
  return new Set(procs.map((p) => p.name.toLowerCase()))
}
