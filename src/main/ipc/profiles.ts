import { ipcMain } from 'electron'
import { IPC } from '@shared/types'
import { dataStore } from '../store'

export function registerProfileHandlers(): void {
  ipcMain.handle(IPC.profilesList, () => dataStore.listProfiles())

  ipcMain.handle(IPC.profilesCreate, (_e, { name }: { name: string }) =>
    dataStore.createProfile(name)
  )

  ipcMain.handle(IPC.profilesRename, (_e, { id, name }: { id: string; name: string }) =>
    dataStore.renameProfile(id, name)
  )

  ipcMain.handle(IPC.profilesDelete, (_e, { id }: { id: string }) => {
    dataStore.deleteProfile(id)
  })

  ipcMain.handle(IPC.profilesSetActive, (_e, { id }: { id: string }) => {
    dataStore.setActiveProfile(id)
  })
}
