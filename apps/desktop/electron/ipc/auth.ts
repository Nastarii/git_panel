import { ipcMain, safeStorage } from 'electron'
import Store from 'electron-store'

type AuthSchema = {
  tokenCipher: string | null
  user: { id: number; login: string; avatarUrl?: string } | null
}

const authStore = new Store<AuthSchema>({
  name: 'auth',
  defaults: { tokenCipher: null, user: null },
  encryptionKey: undefined,
})

function encrypt(plain: string): string {
  if (!safeStorage.isEncryptionAvailable()) return Buffer.from(plain, 'utf8').toString('base64')
  return safeStorage.encryptString(plain).toString('base64')
}

function decrypt(cipher: string): string | null {
  if (!cipher) return null
  try {
    if (!safeStorage.isEncryptionAvailable()) return Buffer.from(cipher, 'base64').toString('utf8')
    return safeStorage.decryptString(Buffer.from(cipher, 'base64'))
  } catch {
    return null
  }
}

export function registerAuthIpc(): void {
  ipcMain.handle('auth:status', () => {
    return { data: { user: authStore.get('user'), hasToken: !!authStore.get('tokenCipher') }, error: null }
  })

  ipcMain.handle('auth:setToken', (_evt, token: string, user: AuthSchema['user']) => {
    authStore.set('tokenCipher', encrypt(token))
    authStore.set('user', user)
    return { data: true, error: null }
  })

  ipcMain.handle('auth:getToken', () => {
    const cipher = authStore.get('tokenCipher')
    if (!cipher) return { data: null, error: null }
    const token = decrypt(cipher)
    return token ? { data: token, error: null } : { data: null, error: { code: 'DECRYPT_FAILED', message: 'Could not decrypt token' } }
  })

  ipcMain.handle('auth:logout', () => {
    authStore.delete('tokenCipher')
    authStore.delete('user')
    return { data: true, error: null }
  })

  // GitHub OAuth device-flow / browser-flow is implemented in Phase 2.
  ipcMain.handle('auth:startGithub', () => {
    return { data: null, error: { code: 'NOT_IMPLEMENTED', message: 'GitHub OAuth flow not yet implemented' } }
  })
}
