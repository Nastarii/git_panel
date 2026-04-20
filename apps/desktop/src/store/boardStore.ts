import { create } from 'zustand'
import type { BoardCard, CardPatch, ColumnId, NewLocalCard } from '@shared/types/board'

type BoardState = {
  cards: BoardCard[]
  syncErrors: Array<{ repo: string; message: string }>
  loading: boolean
  syncing: boolean

  loadLocal: () => Promise<void>
  sync: () => Promise<void>

  createLocal: (input: NewLocalCard) => Promise<void>
  updateLocal: (id: string, patch: Partial<BoardCard>) => Promise<void>
  deleteLocal: (id: string) => Promise<void>

  moveCard: (id: string, column: ColumnId, position: number) => void
  persistMove: (patches: CardPatch[]) => Promise<void>
}

function sortByPosition(a: BoardCard, b: BoardCard): number {
  return a.position - b.position
}

export const useBoardStore = create<BoardState>((set, get) => ({
  cards: [],
  syncErrors: [],
  loading: false,
  syncing: false,

  loadLocal: async () => {
    set({ loading: true })
    const res = await window.api.board.listLocal()
    const local = res.data ?? []
    // keep any existing github cards so a refresh doesn't wipe them
    const existing = get().cards.filter((c) => c.provider === 'github')
    set({ cards: [...existing, ...local].sort(sortByPosition), loading: false })
  },

  sync: async () => {
    set({ syncing: true })
    const res = await window.api.repos.syncAll()
    if (res.data) {
      const local = get().cards.filter((c) => c.provider === 'local')
      set({
        cards: [...local, ...res.data.cards].sort(sortByPosition),
        syncErrors: res.data.errors,
        syncing: false,
      })
    } else {
      set({ syncing: false })
    }
  },

  createLocal: async (input) => {
    const res = await window.api.board.createLocal(input)
    if (res.data) set((s) => ({ cards: [...s.cards, res.data!].sort(sortByPosition) }))
  },

  updateLocal: async (id, patch) => {
    const res = await window.api.board.updateLocal(id, patch)
    if (res.data) {
      set((s) => ({
        cards: s.cards.map((c) => (c.id === id ? res.data! : c)).sort(sortByPosition),
      }))
    }
  },

  deleteLocal: async (id) => {
    await window.api.board.deleteLocal(id)
    set((s) => ({ cards: s.cards.filter((c) => c.id !== id) }))
  },

  moveCard: (id, column, position) => {
    set((s) => ({
      cards: s.cards
        .map((c) => (c.id === id ? { ...c, column, position } : c))
        .sort(sortByPosition),
    }))
  },

  persistMove: async (patches) => {
    await window.api.board.applyPatches(patches)
  },
}))
