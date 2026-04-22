import { create } from 'zustand'

export type SavedCommand = {
  id: string
  name: string
  command: string
  repoId?: string
  createdAt: string
}

type CommandsState = {
  commands: SavedCommand[]
  loading: boolean
  load: () => Promise<void>
  add: (input: Omit<SavedCommand, 'id' | 'createdAt'>) => Promise<void>
  update: (id: string, patch: Partial<Omit<SavedCommand, 'id' | 'createdAt'>>) => Promise<void>
  remove: (id: string) => Promise<void>
}

export const useCommandsStore = create<CommandsState>((set, get) => ({
  commands: [],
  loading: false,

  load: async () => {
    set({ loading: true })
    const res = await window.api.store.get<SavedCommand[]>('savedCommands')
    set({ commands: res.data ?? [], loading: false })
  },

  add: async (input) => {
    const cmd: SavedCommand = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      ...input,
    }
    const commands = [...get().commands, cmd]
    set({ commands })
    await window.api.store.set('savedCommands', commands)
  },

  update: async (id, patch) => {
    const commands = get().commands.map((c) => (c.id === id ? { ...c, ...patch } : c))
    set({ commands })
    await window.api.store.set('savedCommands', commands)
  },

  remove: async (id) => {
    const commands = get().commands.filter((c) => c.id !== id)
    set({ commands })
    await window.api.store.set('savedCommands', commands)
  },
}))
