import { ipcMain } from 'electron'

// Cloud mode (Fastify API) is wired in Phase 3. These handlers return
// NOT_CONFIGURED until the API base URL + JWT flow is in place.

export function registerCloudIpc(): void {
  ipcMain.handle('cloud:status', () => {
    return { data: { connected: false, apiUrl: null }, error: null }
  })

  ipcMain.handle('cloud:connect', () => {
    return { data: null, error: { code: 'NOT_IMPLEMENTED', message: 'Cloud mode not yet implemented' } }
  })

  ipcMain.handle('cloud:fetchBoard', () => {
    return { data: null, error: { code: 'NOT_IMPLEMENTED', message: 'Cloud mode not yet implemented' } }
  })

  ipcMain.handle('cloud:patchCards', () => {
    return { data: null, error: { code: 'NOT_IMPLEMENTED', message: 'Cloud mode not yet implemented' } }
  })
}
