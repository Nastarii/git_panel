import { create } from 'zustand'
import type { TerminalTab } from '@shared/types/terminal'

type TerminalState = {
  tabs: TerminalTab[]
  activeTabId: string | null

  openTab: (cwd?: string, label?: string, shell?: string, initialCommand?: string) => Promise<string>
  closeTab: (id: string) => Promise<void>
  setActive: (id: string) => void
  renameTab: (id: string, label: string) => void
}

export const useTerminalStore = create<TerminalState>((set, get) => ({
  tabs: [],
  activeTabId: null,

  openTab: async (cwd, label, shell, initialCommand) => {
    const result = await window.api.terminal.create({ cwd, shell })
    const tab: TerminalTab = {
      id: result.id,
      label: label ?? deriveLabel(result.cwd),
      cwd: result.cwd,
      shell: result.shell,
      createdAt: new Date().toISOString(),
      initialCommand,
    }
    set((s) => ({ tabs: [...s.tabs, tab], activeTabId: tab.id }))
    return tab.id
  },

  closeTab: async (id) => {
    await window.api.terminal.kill(id)
    set((s) => {
      const tabs = s.tabs.filter((t) => t.id !== id)
      const activeTabId =
        s.activeTabId === id ? (tabs[tabs.length - 1]?.id ?? null) : s.activeTabId
      return { tabs, activeTabId }
    })
  },

  setActive: (id) => {
    if (get().tabs.some((t) => t.id === id)) set({ activeTabId: id })
  },

  renameTab: (id, label) => {
    set((s) => ({ tabs: s.tabs.map((t) => (t.id === id ? { ...t, label } : t)) }))
  },
}))

function deriveLabel(cwd: string): string {
  const parts = cwd.replace(/[\\/]+$/, '').split(/[\\/]/)
  return parts[parts.length - 1] || cwd
}
