import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('electron', () => ({
  app: { getVersion: vi.fn(() => '0.1.0') }
}))

import { app } from 'electron'
import { compareVersions, checkForUpdate, getLastKnownReleaseUrl } from './updates'

describe('compareVersions', () => {
  it('returns 0 for equal versions', () => {
    expect(compareVersions('1.2.3', '1.2.3')).toBe(0)
  })

  it('is positive when a > b, negative when a < b', () => {
    expect(compareVersions('1.2.4', '1.2.3')).toBeGreaterThan(0)
    expect(compareVersions('1.2.3', '1.2.4')).toBeLessThan(0)
    expect(compareVersions('2.0.0', '1.9.9')).toBeGreaterThan(0)
    expect(compareVersions('1.9.9', '2.0.0')).toBeLessThan(0)
  })

  it('treats missing trailing segments as 0 (1.2 == 1.2.0)', () => {
    expect(compareVersions('1.2', '1.2.0')).toBe(0)
    expect(compareVersions('1.3', '1.2.9')).toBeGreaterThan(0)
  })
})

describe('checkForUpdate', () => {
  beforeEach(() => {
    vi.mocked(app.getVersion).mockReturnValue('0.1.0')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('reports update-available when the latest release tag is newer', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        status: 200,
        ok: true,
        json: async () => ({ tag_name: 'v0.2.0', html_url: 'https://github.com/x/x/releases/tag/v0.2.0' })
      })
    )

    const result = await checkForUpdate()
    expect(result).toEqual({
      status: 'update-available',
      currentVersion: '0.1.0',
      latestVersion: '0.2.0',
      releaseUrl: 'https://github.com/x/x/releases/tag/v0.2.0'
    })
    expect(getLastKnownReleaseUrl()).toBe('https://github.com/x/x/releases/tag/v0.2.0')
  })

  it('reports up-to-date when the latest release tag matches the current version', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        status: 200,
        ok: true,
        json: async () => ({ tag_name: 'v0.1.0', html_url: 'https://github.com/x/x/releases/tag/v0.1.0' })
      })
    )

    const result = await checkForUpdate()
    expect(result.status).toBe('up-to-date')
    expect(result.latestVersion).toBe('0.1.0')
    expect(getLastKnownReleaseUrl()).toBeNull()
  })

  it('reports up-to-date (not an error) when no release has ever been published (404)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 404, ok: false }))

    const result = await checkForUpdate()
    expect(result.status).toBe('up-to-date')
    expect(result.message).toMatch(/no releases/i)
  })

  it('reports an error on a non-404 non-ok HTTP response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 500, ok: false }))

    const result = await checkForUpdate()
    expect(result.status).toBe('error')
    expect(result.message).toMatch(/500/)
  })

  it('reports an error when fetch itself throws (network failure)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('getaddrinfo ENOTFOUND')))

    const result = await checkForUpdate()
    expect(result.status).toBe('error')
    expect(result.message).toMatch(/ENOTFOUND/)
  })

  it('reports an error when the response is missing the fields we need', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ status: 200, ok: true, json: async () => ({}) })
    )

    const result = await checkForUpdate()
    expect(result.status).toBe('error')
  })
})
