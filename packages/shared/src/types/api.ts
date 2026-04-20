export type Role = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'

export type Workspace = {
  id: string
  name: string
  slug: string
  ownerId: string
  createdAt: string
}

export type Member = {
  id: string
  userId: string
  workspaceId: string
  role: Role
  login: string
  avatarUrl?: string
}

export type AuthTokens = {
  accessToken: string
  refreshToken: string
  expiresAt: string
}

export type AuthResponse = {
  user: {
    id: string
    githubId: number
    login: string
    email?: string
    avatarUrl?: string
  }
  tokens: AuthTokens
}

export type ApiResult<T> =
  | { data: T; error: null }
  | { data: null; error: { code: string; message: string } }

export type Metrics = {
  totalOpen: number
  totalClosed: number
  throughput: { date: string; closed: number }[]
  leadTimeHours: number
  reviewTimeHours: number
}
