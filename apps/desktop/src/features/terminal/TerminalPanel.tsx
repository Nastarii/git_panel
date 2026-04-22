import { useEffect, useRef } from 'react'
import { useTerminalStore } from '@/store/terminalStore'
import { TerminalTabs } from './TerminalTabs'
import { TerminalToolbar } from './TerminalToolbar'
import { TerminalView } from './Terminal'

export function TerminalPanel() {
  const tabs = useTerminalStore((s) => s.tabs)
  const activeId = useTerminalStore((s) => s.activeTabId)
  const openTab = useTerminalStore((s) => s.openTab)
  const initRef = useRef(false)

  // Auto-open first tab once. Guarded against React StrictMode double-invoke.
  useEffect(() => {
    if (initRef.current) return
    initRef.current = true
    if (useTerminalStore.getState().tabs.length === 0) void openTab()
  }, [openTab])

  return (
    <div className="flex h-full flex-col bg-panel-bg">
      <TerminalTabs />
      <TerminalToolbar />
      <div className="flex-1 relative">
        {tabs.map((t) => (
          <div key={t.id} className="absolute inset-0">
            <TerminalView id={t.id} active={t.id === activeId} initialCommand={t.initialCommand} />
          </div>
        ))}
        {tabs.length === 0 && (
          <div className="flex h-full items-center justify-center text-panel-muted text-sm">
            No terminal sessions
          </div>
        )}
      </div>
    </div>
  )
}
