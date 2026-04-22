import { create } from 'zustand'

export type View = 'board' | 'repos' | 'metrics' | 'team' | 'terminal' | 'settings' | 'commands'

type UIState = {
  view: View
  terminalOpen: boolean
  setView: (view: View) => void
  toggleTerminal: () => void
  setTerminalOpen: (open: boolean) => void
}

export const useUIStore = create<UIState>((set) => ({
  view: 'board',
  terminalOpen: true,
  setView: (view) => set({ view }),
  toggleTerminal: () => set((s) => ({ terminalOpen: !s.terminalOpen })),
  setTerminalOpen: (terminalOpen) => set({ terminalOpen }),
}))
