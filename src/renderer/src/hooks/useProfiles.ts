import { useCallback, useEffect, useState } from 'react'
import type { Profile, ProgramEntry } from '@shared/types'

export function useProfiles(): {
  profiles: Profile[]
  activeProfile: Profile | null
  activeProfileId: string | null
  loading: boolean
  selectProfile: (id: string) => void
  createProfile: (name: string) => Promise<void>
  renameProfile: (id: string, name: string) => Promise<void>
  deleteProfile: (id: string) => Promise<void>
  addEntry: (entry: Omit<ProgramEntry, 'id'>) => Promise<void>
  removeEntry: (entryId: string) => Promise<void>
  updateEntry: (entryId: string, patch: Partial<ProgramEntry>) => Promise<void>
  reorderEntries: (orderedIds: string[]) => Promise<void>
} {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    window.api.profiles.list().then((list) => {
      setProfiles(list)
      setActiveProfileId((prev) => prev ?? list[0]?.id ?? null)
      setLoading(false)
    })
  }, [])

  const replaceProfile = useCallback((updated: Profile) => {
    setProfiles((prev) => {
      const exists = prev.some((p) => p.id === updated.id)
      return exists ? prev.map((p) => (p.id === updated.id ? updated : p)) : [...prev, updated]
    })
  }, [])

  const selectProfile = useCallback((id: string) => {
    setActiveProfileId(id)
    void window.api.profiles.setActive(id)
  }, [])

  const createProfile = useCallback(
    async (name: string) => {
      const profile = await window.api.profiles.create(name)
      replaceProfile(profile)
      selectProfile(profile.id)
    },
    [replaceProfile, selectProfile]
  )

  const renameProfile = useCallback(
    async (id: string, name: string) => {
      const profile = await window.api.profiles.rename(id, name)
      replaceProfile(profile)
    },
    [replaceProfile]
  )

  const deleteProfile = useCallback(
    async (id: string) => {
      await window.api.profiles.delete(id)
      const remaining = await window.api.profiles.list()
      setProfiles(remaining)
      setActiveProfileId((prev) => (prev === id ? (remaining[0]?.id ?? null) : prev))
    },
    []
  )

  const addEntry = useCallback(
    async (entry: Omit<ProgramEntry, 'id'>) => {
      if (!activeProfileId) return
      replaceProfile(await window.api.entries.add(activeProfileId, entry))
    },
    [activeProfileId, replaceProfile]
  )

  const removeEntry = useCallback(
    async (entryId: string) => {
      if (!activeProfileId) return
      replaceProfile(await window.api.entries.remove(activeProfileId, entryId))
    },
    [activeProfileId, replaceProfile]
  )

  const updateEntry = useCallback(
    async (entryId: string, patch: Partial<ProgramEntry>) => {
      if (!activeProfileId) return
      replaceProfile(await window.api.entries.update(activeProfileId, entryId, patch))
    },
    [activeProfileId, replaceProfile]
  )

  const reorderEntries = useCallback(
    async (orderedIds: string[]) => {
      if (!activeProfileId) return
      replaceProfile(await window.api.entries.reorder(activeProfileId, orderedIds))
    },
    [activeProfileId, replaceProfile]
  )

  const activeProfile = profiles.find((p) => p.id === activeProfileId) ?? null

  return {
    profiles,
    activeProfile,
    activeProfileId,
    loading,
    selectProfile,
    createProfile,
    renameProfile,
    deleteProfile,
    addEntry,
    removeEntry,
    updateEntry,
    reorderEntries
  }
}
