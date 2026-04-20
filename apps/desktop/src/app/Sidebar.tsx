import clsx from 'clsx'
import { useUIStore, type View } from '@/store/uiStore'

const links: Array<{ id: View; label: string; icon: string }> = [
  { id: 'board', label: 'Board', icon: '▤' },
  { id: 'repos', label: 'Repositories', icon: '▣' },
  { id: 'metrics', label: 'Metrics', icon: '▲' },
  { id: 'team', label: 'Team', icon: '●' },
  { id: 'terminal', label: 'Terminal', icon: '>_' },
  { id: 'settings', label: 'Settings', icon: '⚙' },
]

export function Sidebar() {
  const view = useUIStore((s) => s.view)
  const setView = useUIStore((s) => s.setView)
  const toggleTerminal = useUIStore((s) => s.toggleTerminal)

  return (
    <aside className="w-52 shrink-0 flex-col border-r border-panel-border bg-panel-surface/40 flex">
      <div className="flex items-center gap-2 px-4 py-4 border-b border-panel-border">
        <div className="h-6 w-6 rounded bg-panel-accent/20 text-panel-accent text-sm font-bold flex items-center justify-center">G</div>
        <span className="text-sm font-semibold tracking-tight">GitPanel</span>
      </div>
      <nav className="flex-1 overflow-y-auto p-2">
        {links.map((link) => (
          <div
            key={link.id}
            onClick={() => {
              if (link.id === 'terminal') toggleTerminal()
              else setView(link.id)
            }}
            className={clsx(
              'sidebar-link',
              view === link.id && link.id !== 'terminal' && 'sidebar-link-active',
            )}
          >
            <span className="font-mono text-xs w-4 text-center">{link.icon}</span>
            <span>{link.label}</span>
          </div>
        ))}
      </nav>
      <div className="border-t border-panel-border p-3 text-xs text-panel-muted">
        <div>Local mode</div>
        <div className="font-mono truncate">not signed in</div>
      </div>
    </aside>
  )
}
