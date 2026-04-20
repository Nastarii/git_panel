import { useEffect } from 'react'
import { useTerminalStore } from '@/store/terminalStore'
import { TerminalTabs } from './TerminalTabs'
import { TerminalToolbar } from './TerminalToolbar'
import { TerminalView } from './Terminal'

export function TerminalPanel() {
  const tabs = useTerminalStore((s) => s.tabs)
  const activeId = useTerminalStore((s) => s.activeTabId)
  const openTab = useTerminalStore((s) => s.openTab)

  useEffect(() => {
    if (tabs.length === 0) void openTab()
  }, [tabs.length, openTab])

  return (
    <div className="flex h-full flex-col bg-panel-bg">
      <TerminalTabs />
      <TerminalToolbar />
      <div className="flex-1 relative">
        {tabs.map((t) => (
          <div key={t.id} className="absolute inset-0">
            <TerminalView id={t.id} active={t.id === activeId} />
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
