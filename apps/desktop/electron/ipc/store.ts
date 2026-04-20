import { ipcMain } from 'electron'
import Store from 'electron-store'

type Schema = {
  watchedRepos: unknown[]
  boardOverrides: Record<string, unknown>
  settings: Record<string, unknown>
  cloud: { apiUrl?: string; workspaceSlug?: string } | null
}

const store = new Store<Schema>({
  defaults: {
    watchedRepos: [],
    boardOverrides: {},
    settings: {},
    cloud: null,
  },
})

export function registerStoreIpc(): void {
  ipcMain.handle('store:get', (_evt, key: keyof Schema) => {
    return { data: store.get(key), error: null }
  })

  ipcMain.handle('store:set', (_evt, key: keyof Schema, value: unknown) => {
    store.set(key, value as never)
    return { data: true, error: null }
  })

  ipcMain.handle('store:delete', (_evt, key: keyof Schema) => {
    store.delete(key)
    return { data: true, error: null }
  })
}
