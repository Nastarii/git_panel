import { useUIStore } from '@/store/uiStore'
import { Sidebar } from './Sidebar'
import { BoardView } from '@/features/board/BoardView'
import { ReposView } from '@/features/repos/ReposView'
import { MetricsView } from '@/features/metrics/MetricsView'
import { TeamView } from '@/features/team/TeamView'
import { SettingsView } from '@/features/settings/SettingsView'
import { TerminalPanel } from '@/features/terminal/TerminalPanel'

export function App() {
  const view = useUIStore((s) => s.view)
  const terminalOpen = useUIStore((s) => s.terminalOpen)

  return (
    <div className="flex h-full w-full">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0">
        <section className="flex-1 min-h-0 overflow-hidden">
          {view === 'board' && <BoardView />}
          {view === 'repos' && <ReposView />}
          {view === 'metrics' && <MetricsView />}
          {view === 'team' && <TeamView />}
          {view === 'settings' && <SettingsView />}
        </section>
        {terminalOpen && (
          <section className="h-80 shrink-0 border-t border-panel-border">
            <TerminalPanel />
          </section>
        )}
      </main>
    </div>
  )
}
