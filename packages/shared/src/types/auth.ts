export type AuthMode = 'none' | 'env-token' | 'oauth-device'

export type AuthUser = {
  id: number
  login: string
  name?: string
  email?: string
  avatarUrl?: string
}

export type AuthStatus = {
  mode: AuthMode
  user: AuthUser | null
  tokenSource: 'env' | 'keystore' | null
  clientIdConfigured: boolean
}

export type DeviceCodeResponse = {
  deviceCode: string
  userCode: string
  verificationUri: string
  expiresIn: number
  interval: number
}

export type DeviceFlowProgress =
  | { status: 'pending' }
  | { status: 'authorized'; user: AuthUser }
  | { status: 'expired' }
  | { status: 'denied' }
  | { status: 'error'; message: string }
