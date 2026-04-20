import { create } from 'zustand'
import type { WatchedRepo } from '@shared/types/github'

type ReposState = {
  repos: WatchedRepo[]
  loading: boolean
  refresh: () => Promise<void>
  add: (fullName: string, localPath?: string) => Promise<string | null>
  remove: (id: string) => Promise<void>
  setLocalPath: (id: string, localPath: string | null) => Promise<void>
}

export const useReposStore = create<ReposState>((set, get) => ({
  repos: [],
  loading: false,

  refresh: async () => {
    set({ loading: true })
    const res = await window.api.repos.list()
    set({ repos: res.data ?? [], loading: false })
  },

  add: async (fullName, localPath) => {
    const res = await window.api.repos.add(fullName, localPath)
    if (res.data) {
      set({ repos: [...get().repos, res.data] })
      return null
    }
    return res.error?.message ?? 'Failed to add repo'
  },

  remove: async (id) => {
    await window.api.repos.remove(id)
    set({ repos: get().repos.filter((r) => r.id !== id) })
  },

  setLocalPath: async (id, localPath) => {
    await window.api.repos.setLocalPath(id, localPath)
    set({
      repos: get().repos.map((r) => (r.id === id ? { ...r, localPath: localPath ?? undefined } : r)),
    })
  },
}))
