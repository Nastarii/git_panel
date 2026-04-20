import clsx from 'clsx'
import { useTerminalStore } from '@/store/terminalStore'

export function TerminalTabs() {
  const tabs = useTerminalStore((s) => s.tabs)
  const activeId = useTerminalStore((s) => s.activeTabId)
  const setActive = useTerminalStore((s) => s.setActive)
  const closeTab = useTerminalStore((s) => s.closeTab)
  const openTab = useTerminalStore((s) => s.openTab)

  return (
    <div className="flex items-center gap-1 border-b border-panel-border bg-panel-surface/60 px-2 h-9 overflow-x-auto">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          onClick={() => setActive(tab.id)}
          className={clsx(
            'group flex items-center gap-2 rounded-t-md px-3 py-1.5 text-xs cursor-pointer select-none',
            activeId === tab.id
              ? 'bg-panel-bg text-panel-text border-t border-x border-panel-border -mb-px'
              : 'text-panel-muted hover:text-panel-text',
          )}
        >
          <span className="font-mono truncate max-w-[160px]">{tab.label}</span>
          <button
            onClick={(e) => {
              e.stopPropagation()
              void closeTab(tab.id)
            }}
            className="text-panel-muted opacity-0 group-hover:opacity-100 hover:text-panel-danger"
            aria-label={`Close ${tab.label}`}
          >
            ×
          </button>
        </div>
      ))}
      <button
        onClick={() => void openTab()}
        className="ml-1 rounded px-2 py-0.5 text-sm text-panel-muted hover:text-panel-accent"
        title="New terminal"
      >
        +
      </button>
    </div>
  )
}
