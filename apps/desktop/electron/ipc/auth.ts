import { ipcMain, safeStorage, shell } from 'electron'
import Store from 'electron-store'
import { Octokit } from '@octokit/rest'
import { getEnv } from '../env'
import type { WindowProvider } from './index'
import type { AuthMode, AuthStatus, AuthUser, DeviceCodeResponse } from '@shared/types/auth'

type AuthSchema = {
  tokenCipher: string | null
  user: AuthUser | null
}

const authStore = new Store<AuthSchema>({
  name: 'auth',
  defaults: { tokenCipher: null, user: null },
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

/**
 * Resolve the effective access token.
 *  1. GITHUB_TOKEN from .env (dev convenience — always wins)
 *  2. User-authorized token from secure storage (OAuth device flow)
 */
export function resolveToken(): { token: string | null; source: 'env' | 'keystore' | null } {
  const env = getEnv()
  if (env.githubToken) return { token: env.githubToken, source: 'env' }
  const cipher = authStore.get('tokenCipher')
  if (!cipher) return { token: null, source: null }
  const token = decrypt(cipher)
  return token ? { token, source: 'keystore' } : { token: null, source: null }
}

export function resolveMode(): AuthMode {
  const { source } = resolveToken()
  if (source === 'env') return 'env-token'
  if (source === 'keystore') return 'oauth-device'
  return 'none'
}

async function fetchUser(token: string): Promise<AuthUser | null> {
  try {
    const octo = new Octokit({ auth: token })
    const { data } = await octo.users.getAuthenticated()
    return {
      id: data.id,
      login: data.login,
      name: data.name ?? undefined,
      email: data.email ?? undefined,
      avatarUrl: data.avatar_url,
    }
  } catch {
    return null
  }
}

// --- Device-flow state ---------------------------------------------------
type DeviceFlow = {
  deviceCode: string
  interval: number
  expiresAt: number
  timer: NodeJS.Timeout | null
  aborted: boolean
}

let currentFlow: DeviceFlow | null = null

function cancelFlow(): void {
  if (!currentFlow) return
  currentFlow.aborted = true
  if (currentFlow.timer) clearTimeout(currentFlow.timer)
  currentFlow = null
}

async function startDeviceFlow(clientId: string): Promise<DeviceCodeResponse> {
  const body = new URLSearchParams({
    client_id: clientId,
    scope: 'repo read:user read:org',
  })
  const res = await fetch('https://github.com/login/device/code', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
      'User-Agent': 'GitPanel',
    },
    body,
  })

  const raw = await res.text()
  if (!res.ok) {
    const hint =
      res.status === 404
        ? ' — check that "Enable Device Flow" is on in your OAuth App settings, and that GITHUB_CLIENT_ID matches the app (not a client secret or GitHub App installation ID).'
        : ''
    throw new Error(`device/code failed (${res.status})${hint}${raw ? ` · body: ${raw.slice(0, 200)}` : ''}`)
  }

  let json: {
    device_code?: string
    user_code?: string
    verification_uri?: string
    expires_in?: number
    interval?: number
    error?: string
    error_description?: string
  }
  try {
    json = JSON.parse(raw)
  } catch {
    throw new Error(`device/code returned non-JSON body: ${raw.slice(0, 200)}`)
  }

  if (json.error || !json.device_code) {
    throw new Error(json.error_description ?? json.error ?? 'device/code returned no device_code')
  }

  return {
    deviceCode: json.device_code,
    userCode: json.user_code!,
    verificationUri: json.verification_uri!,
    expiresIn: json.expires_in!,
    interval: json.interval ?? 5,
  }
}

async function pollDeviceFlow(
  clientId: string,
  flow: DeviceFlow,
  getWindow: WindowProvider,
): Promise<void> {
  if (flow.aborted) return
  if (Date.now() > flow.expiresAt) {
    getWindow()?.webContents.send('auth:device:progress', { status: 'expired' })
    currentFlow = null
    return
  }

  let body: {
    access_token?: string
    error?: string
    error_description?: string
    interval?: number
  }
  try {
    const form = new URLSearchParams({
      client_id: clientId,
      device_code: flow.deviceCode,
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
    })
    const res = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
        'User-Agent': 'GitPanel',
      },
      body: form,
    })
    body = (await res.json()) as typeof body
  } catch (err) {
    getWindow()?.webContents.send('auth:device:progress', {
      status: 'error',
      message: (err as Error).message,
    })
    currentFlow = null
    return
  }

  if (body.access_token) {
    const user = await fetchUser(body.access_token)
    if (!user) {
      getWindow()?.webContents.send('auth:device:progress', {
        status: 'error',
        message: 'Token accepted but failed to fetch user.',
      })
      currentFlow = null
      return
    }
    authStore.set('tokenCipher', encrypt(body.access_token))
    authStore.set('user', user)
    getWindow()?.webContents.send('auth:device:progress', { status: 'authorized', user })
    currentFlow = null
    return
  }

  switch (body.error) {
    case 'authorization_pending':
      getWindow()?.webContents.send('auth:device:progress', { status: 'pending' })
      break
    case 'slow_down':
      flow.interval = (body.interval ?? flow.interval) + 5
      getWindow()?.webContents.send('auth:device:progress', { status: 'pending' })
      break
    case 'expired_token':
      getWindow()?.webContents.send('auth:device:progress', { status: 'expired' })
      currentFlow = null
      return
    case 'access_denied':
      getWindow()?.webContents.send('auth:device:progress', { status: 'denied' })
      currentFlow = null
      return
    default:
      getWindow()?.webContents.send('auth:device:progress', {
        status: 'error',
        message: body.error_description ?? body.error ?? 'unknown error',
      })
      currentFlow = null
      return
  }

  flow.timer = setTimeout(() => void pollDeviceFlow(clientId, flow, getWindow), flow.interval * 1000)
}

// --- IPC -----------------------------------------------------------------
export function registerAuthIpc(getWindow: WindowProvider): void {
  ipcMain.handle('auth:status', async () => {
    const env = getEnv()
    const mode = resolveMode()
    const { source } = resolveToken()
    const user = mode === 'env-token' ? await fetchUserForEnv() : authStore.get('user')
    const status: AuthStatus = {
      mode,
      user,
      tokenSource: source,
      clientIdConfigured: !!env.githubClientId,
    }
    return { data: status, error: null }
  })

  ipcMain.handle('auth:startDeviceFlow', async () => {
    const env = getEnv()
    if (env.githubToken) {
      return { data: null, error: { code: 'ENV_TOKEN_ACTIVE', message: 'GITHUB_TOKEN already set in .env' } }
    }
    if (!env.githubClientId) {
      return { data: null, error: { code: 'NO_CLIENT_ID', message: 'GITHUB_CLIENT_ID not configured. Set it in .env or in a packaged build.' } }
    }

    cancelFlow()

    try {
      const code = await startDeviceFlow(env.githubClientId)
      currentFlow = {
        deviceCode: code.deviceCode,
        interval: code.interval,
        expiresAt: Date.now() + code.expiresIn * 1000,
        timer: null,
        aborted: false,
      }
      // Open the verification URL for the user automatically.
      void shell.openExternal(code.verificationUri)
      // Schedule the first poll after `interval` seconds.
      currentFlow.timer = setTimeout(
        () => void pollDeviceFlow(env.githubClientId!, currentFlow!, getWindow),
        code.interval * 1000,
      )
      return { data: code, error: null }
    } catch (err) {
      return { data: null, error: { code: 'DEVICE_FLOW_FAILED', message: (err as Error).message } }
    }
  })

  ipcMain.handle('auth:cancelDeviceFlow', () => {
    cancelFlow()
    return { data: true, error: null }
  })

  ipcMain.handle('auth:logout', () => {
    authStore.delete('tokenCipher')
    authStore.delete('user')
    cancelFlow()
    return { data: true, error: null }
  })
}

let envUserCache: { token: string; user: AuthUser | null } | null = null
async function fetchUserForEnv(): Promise<AuthUser | null> {
  const env = getEnv()
  if (!env.githubToken) return null
  if (envUserCache && envUserCache.token === env.githubToken) return envUserCache.user
  const user = await fetchUser(env.githubToken)
  envUserCache = { token: env.githubToken, user }
  return user
}
