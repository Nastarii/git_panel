import { useTerminalStore } from '@/store/terminalStore'

export function TerminalToolbar() {
  const activeTab = useTerminalStore((s) => s.tabs.find((t) => t.id === s.activeTabId))
  const closeTab = useTerminalStore((s) => s.closeTab)

  return (
    <div className="flex items-center justify-between border-b border-panel-border bg-panel-surface/40 px-3 py-1.5 text-xs text-panel-muted">
      <div className="flex items-center gap-3">
        <span className="font-mono">{activeTab?.shell ?? '—'}</span>
        <span className="truncate">{activeTab?.cwd ?? ''}</span>
      </div>
      {activeTab && (
        <button
          onClick={() => void closeTab(activeTab.id)}
          className="text-panel-muted hover:text-panel-danger"
        >
          Kill session
        </button>
      )}
    </div>
  )
}
