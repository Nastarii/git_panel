import { useEffect } from 'react'
import clsx from 'clsx'
import {
  Kanban,
  Zap,
  BarChart3,
  Users,
  SquareTerminal,
  Settings,
  type LucideIcon,
  FolderGit2,
} from 'lucide-react'
import { useUIStore, type View } from '@/store/uiStore'
import { useAuthStore } from '@/store/authStore'

const links: Array<{ id: View; label: string; Icon: LucideIcon }> = [
  { id: 'board',    label: 'Board',    Icon: Kanban },
  { id: 'repos',    label: 'Projects', Icon: FolderGit2 },
  { id: 'commands', label: 'Commands', Icon: Zap },
  { id: 'metrics',  label: 'Metrics',  Icon: BarChart3 },
  { id: 'team',     label: 'Team',     Icon: Users },
  { id: 'terminal', label: 'Terminal', Icon: SquareTerminal },
  { id: 'settings', label: 'Settings', Icon: Settings },
]

function modeLabel(mode: string): string {
  switch (mode) {
    case 'env-token': return 'via .env'
    case 'oauth-device': return 'OAuth'
    default: return 'not signed in'
  }
}

export function Sidebar() {
  const view = useUIStore((s) => s.view)
  const setView = useUIStore((s) => s.setView)
  const toggleTerminal = useUIStore((s) => s.toggleTerminal)
  const status = useAuthStore((s) => s.status)
  const refresh = useAuthStore((s) => s.refresh)

  useEffect(() => { void refresh() }, [refresh])

  return (
    <aside className="w-52 shrink-0 flex-col border-r border-panel-border bg-panel-surface/40 flex">
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
            <link.Icon size={15} strokeWidth={1.6} />
            <span>{link.label}</span>
          </div>
        ))}
      </nav>
      <div className="border-t border-panel-border p-3 text-xs text-panel-muted">
        {status?.user ? (
          <div className="flex items-center gap-2">
            {status.user.avatarUrl && (
              <img src={status.user.avatarUrl} alt={status.user.login} className="h-6 w-6 rounded-full" />
            )}
            <div className="min-w-0">
              <div className="truncate text-panel-text">{status.user.login}</div>
              <div className="truncate">{modeLabel(status.mode)}</div>
            </div>
          </div>
        ) : (
          <>
            <div>Local mode</div>
            <div className="font-mono truncate">{modeLabel(status?.mode ?? 'none')}</div>
          </>
        )}
      </div>
    </aside>
  )
}
