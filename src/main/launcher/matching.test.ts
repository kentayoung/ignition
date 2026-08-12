import { describe, it, expect } from 'vitest'
import { deriveMatchName, isEntryRunning } from './matching'

describe('deriveMatchName', () => {
  it('derives from the basename for a Windows .exe', () => {
    expect(deriveMatchName({ path: 'C:\\Program Files\\RaceLab\\RaceLab.exe' })).toBe('racelab')
  })

  it('derives from the basename for a macOS .app bundle', () => {
    expect(deriveMatchName({ path: '/Applications/Discord.app' })).toBe('discord')
  })

  it('derives from the basename for a plain unix binary (no extension to strip)', () => {
    expect(deriveMatchName({ path: '/usr/local/bin/crewchief' })).toBe('crewchief')
  })

  it('lowercases the derived name', () => {
    expect(deriveMatchName({ path: '/Applications/Trading Paints.app' })).toBe('trading paints')
  })

  it('prefers a manual matchName override over the path basename', () => {
    expect(
      deriveMatchName({ path: '/Applications/Moza Pit House.app', matchName: 'PitHouseBridge' })
    ).toBe('pithousebridge')
  })

  it('trims whitespace on the override and falls back if it is blank', () => {
    expect(deriveMatchName({ path: '/Applications/Foo.app', matchName: '  Bar  ' })).toBe('bar')
    expect(deriveMatchName({ path: '/Applications/Foo.app', matchName: '   ' })).toBe('foo')
    expect(deriveMatchName({ path: '/Applications/Foo.app', matchName: undefined })).toBe('foo')
  })
})

describe('isEntryRunning', () => {
  it('matches a Windows process name against a .exe path, ignoring the .exe suffix', () => {
    const entry = { path: 'C:\\Program Files\\RaceLab\\RaceLab.exe' }
    expect(isEntryRunning(entry, new Set(['racelab.exe', 'explorer.exe']))).toBe(true)
  })

  it('matches a macOS process name against a .app path', () => {
    const entry = { path: '/Applications/Discord.app' }
    expect(isEntryRunning(entry, new Set(['discord', 'finder']))).toBe(true)
  })

  it('returns false when nothing in the running set matches', () => {
    const entry = { path: '/Applications/Discord.app' }
    expect(isEntryRunning(entry, new Set(['slack', 'finder']))).toBe(false)
  })

  it('returns false against an empty running set', () => {
    expect(isEntryRunning({ path: '/Applications/Discord.app' }, new Set())).toBe(false)
  })

  it('uses the matchName override to match a process name that differs from the .app folder name', () => {
    // e.g. CFBundleExecutable inside the bundle doesn't match the .app folder name
    const entry = { path: '/Applications/Moza Pit House.app', matchName: 'PitHouseBridge' }
    expect(isEntryRunning(entry, new Set(['pithousebridge']))).toBe(true)
    expect(isEntryRunning(entry, new Set(['moza pit house']))).toBe(false)
  })
})
