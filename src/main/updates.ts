import { app } from 'electron'
import type { UpdateCheckResult } from '@shared/types'

const REPO = 'kentayoung/ignition'

// Set after a check finds something newer, so "View Release" doesn't need to
// re-fetch or trust a URL handed back from the renderer.
let lastKnownRelease: { version: string; url: string } | null = null

function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] ?? 0
    const nb = pb[i] ?? 0
    if (na !== nb) return na - nb
  }
  return 0
}

export async function checkForUpdate(): Promise<UpdateCheckResult> {
  const currentVersion = app.getVersion()

  let res: Response
  try {
    res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers: { 'User-Agent': 'ignition-app', Accept: 'application/vnd.github+json' }
    })
  } catch (err) {
    return { status: 'error', currentVersion, message: (err as Error).message }
  }

  if (res.status === 404) {
    // No tagged release published yet — not an error, just nothing to compare against.
    return { status: 'up-to-date', currentVersion, message: 'No releases have been published yet.' }
  }
  if (!res.ok) {
    return { status: 'error', currentVersion, message: `GitHub returned HTTP ${res.status}` }
  }

  const data = (await res.json()) as { tag_name?: string; html_url?: string }
  const latestVersion = (data.tag_name ?? '').replace(/^v/, '')
  const releaseUrl = data.html_url
  if (!latestVersion || !releaseUrl) {
    return { status: 'error', currentVersion, message: 'Unexpected response from GitHub.' }
  }

  if (compareVersions(latestVersion, currentVersion) > 0) {
    lastKnownRelease = { version: latestVersion, url: releaseUrl }
    return { status: 'update-available', currentVersion, latestVersion, releaseUrl }
  }

  lastKnownRelease = null
  return { status: 'up-to-date', currentVersion, latestVersion }
}

export function getLastKnownReleaseUrl(): string | null {
  return lastKnownRelease?.url ?? null
}
