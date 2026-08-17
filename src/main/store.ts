import Store from 'electron-store'
import { randomUUID } from 'crypto'
import type { AppData, Profile, ProgramEntry } from '@shared/types'

const DEFAULT_PROFILE_NAME = 'My Programs'

function makeProfile(name: string): Profile {
  const now = Date.now()
  return { id: randomUUID(), name, entries: [], createdAt: now, updatedAt: now }
}

// electron-store v8 (CJS) is used deliberately over v9+ (ESM-only) so main-process
// code here can stay plain CommonJS/require-friendly without a dynamic import.
const store = new Store<AppData>({
  name: 'ignition-data',
  defaults: {
    schemaVersion: 1,
    profiles: [],
    activeProfileId: null,
    settings: {
      themeMode: 'system',
      autoCheckForUpdates: true,
      launchOnStartup: false,
      launchOnStartupDelaySeconds: 0
    }
  }
})

function ensureAtLeastOneProfile(): void {
  if (store.get('profiles').length === 0) {
    const profile = makeProfile(DEFAULT_PROFILE_NAME)
    store.set('profiles', [profile])
    store.set('activeProfileId', profile.id)
  } else if (!store.get('activeProfileId')) {
    store.set('activeProfileId', store.get('profiles')[0].id)
  }
}
ensureAtLeastOneProfile()

function getProfiles(): Profile[] {
  return store.get('profiles')
}

function requireProfile(profiles: Profile[], profileId: string): Profile {
  const profile = profiles.find((p) => p.id === profileId)
  if (!profile) throw new Error(`Profile not found: ${profileId}`)
  return profile
}

function saveProfiles(profiles: Profile[]): void {
  store.set('profiles', profiles)
}

export const dataStore = {
  listProfiles(): Profile[] {
    return getProfiles()
  },

  getActiveProfileId(): string | null {
    return store.get('activeProfileId')
  },

  setActiveProfile(profileId: string): void {
    requireProfile(getProfiles(), profileId)
    store.set('activeProfileId', profileId)
  },

  createProfile(name: string): Profile {
    const profile = makeProfile(name)
    saveProfiles([...getProfiles(), profile])
    return profile
  },

  renameProfile(profileId: string, name: string): Profile {
    const profiles = getProfiles()
    const profile = requireProfile(profiles, profileId)
    profile.name = name
    profile.updatedAt = Date.now()
    saveProfiles(profiles)
    return profile
  },

  deleteProfile(profileId: string): void {
    const profiles = getProfiles().filter((p) => p.id !== profileId)
    // Never allow the last profile to be deleted — always leave the user with something to launch.
    if (profiles.length === 0) profiles.push(makeProfile(DEFAULT_PROFILE_NAME))
    saveProfiles(profiles)
    if (store.get('activeProfileId') === profileId) {
      store.set('activeProfileId', profiles[0].id)
    }
  },

  addEntry(profileId: string, entry: Omit<ProgramEntry, 'id'>): Profile {
    const profiles = getProfiles()
    const profile = requireProfile(profiles, profileId)
    profile.entries.push({ ...entry, id: randomUUID() })
    profile.updatedAt = Date.now()
    saveProfiles(profiles)
    return profile
  },

  removeEntry(profileId: string, entryId: string): Profile {
    const profiles = getProfiles()
    const profile = requireProfile(profiles, profileId)
    profile.entries = profile.entries.filter((e) => e.id !== entryId)
    profile.updatedAt = Date.now()
    saveProfiles(profiles)
    return profile
  },

  updateEntry(profileId: string, entryId: string, patch: Partial<ProgramEntry>): Profile {
    const profiles = getProfiles()
    const profile = requireProfile(profiles, profileId)
    const entry = profile.entries.find((e) => e.id === entryId)
    if (!entry) throw new Error(`Entry not found: ${entryId}`)
    Object.assign(entry, patch, { id: entry.id })
    profile.updatedAt = Date.now()
    saveProfiles(profiles)
    return profile
  },

  reorderEntries(profileId: string, orderedIds: string[]): Profile {
    const profiles = getProfiles()
    const profile = requireProfile(profiles, profileId)
    const byId = new Map(profile.entries.map((e) => [e.id, e]))
    const reordered = orderedIds.map((id) => byId.get(id)).filter((e): e is ProgramEntry => !!e)
    // Defensive: if the id list didn't cover every entry, keep the leftovers appended.
    const missing = profile.entries.filter((e) => !orderedIds.includes(e.id))
    profile.entries = [...reordered, ...missing]
    profile.updatedAt = Date.now()
    saveProfiles(profiles)
    return profile
  },

  getSettings(): AppData['settings'] {
    // electron-store only merges `defaults` for keys entirely absent from the persisted file,
    // not per-field — so fill gaps per-field at read time instead of requiring a migration step.
    const stored = store.get('settings')
    return {
      themeMode: stored.themeMode ?? 'system',
      autoCheckForUpdates: stored.autoCheckForUpdates ?? true,
      launchOnStartup: stored.launchOnStartup ?? false,
      launchOnStartupDelaySeconds: stored.launchOnStartupDelaySeconds ?? 0
    }
  },

  updateSettings(patch: Partial<AppData['settings']>): void {
    store.set('settings', { ...dataStore.getSettings(), ...patch })
  },

  setThemeMode(themeMode: AppData['settings']['themeMode']): void {
    dataStore.updateSettings({ themeMode })
  },

  setAutoCheckForUpdates(autoCheckForUpdates: boolean): void {
    dataStore.updateSettings({ autoCheckForUpdates })
  },

  setLaunchOnStartup(launchOnStartup: boolean): void {
    dataStore.updateSettings({ launchOnStartup })
  },

  setLaunchOnStartupDelaySeconds(launchOnStartupDelaySeconds: number): void {
    // Clamp server-side too — the renderer clamps, but IPC can be called directly.
    const clamped = Math.max(0, Math.min(3600, Math.round(launchOnStartupDelaySeconds) || 0))
    dataStore.updateSettings({ launchOnStartupDelaySeconds: clamped })
  }
}
