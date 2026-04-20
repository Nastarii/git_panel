import { create } from 'zustand'
import type { AuthStatus } from '@shared/types/auth'

type AuthState = {
  status: AuthStatus | null
  loading: boolean
  refresh: () => Promise<void>
  logout: () => Promise<void>
}

const emptyStatus: AuthStatus = {
  mode: 'none',
  user: null,
  tokenSource: null,
  clientIdConfigured: false,
}

export const useAuthStore = create<AuthState>((set) => ({
  status: null,
  loading: false,
  refresh: async () => {
    set({ loading: true })
    const res = await window.api.auth.status()
    set({ status: res.data ?? emptyStatus, loading: false })
  },
  logout: async () => {
    await window.api.auth.logout()
    await useAuthStore.getState().refresh()
  },
}))
