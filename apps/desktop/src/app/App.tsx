import { useState } from 'react'
import { useUIStore } from '@/store/uiStore'
import { Sidebar } from './Sidebar'
import { SplashScreen } from './SplashScreen'
import { TitleBar } from './TitleBar'
import { BoardView } from '@/features/board/BoardView'
import { ReposView } from '@/features/repos/ReposView'
import { MetricsView } from '@/features/metrics/MetricsView'
import { TeamView } from '@/features/team/TeamView'
import { SettingsView } from '@/features/settings/SettingsView'
import { TerminalPanel } from '@/features/terminal/TerminalPanel'
import { CommandsView } from '@/features/commands/CommandsView'

export function App() {
  const view = useUIStore((s) => s.view)
  const terminalOpen = useUIStore((s) => s.terminalOpen)
  const [splash, setSplash] = useState(true)

  return (
    <div className="flex flex-col h-full w-full">
      {splash && <SplashScreen onDone={() => setSplash(false)} />}
      <TitleBar />
      <div className="flex flex-1 min-h-0 w-full">
        <Sidebar />
        <main className="flex-1 flex flex-col min-w-0">
          <section className="flex-1 min-h-0 overflow-hidden">
            {view === 'board' && <div key="board" className="view-animate h-full"><BoardView /></div>}
            {view === 'repos' && <div key="repos" className="view-animate h-full"><ReposView /></div>}
            {view === 'metrics' && <div key="metrics" className="view-animate h-full"><MetricsView /></div>}
            {view === 'team' && <div key="team" className="view-animate h-full"><TeamView /></div>}
            {view === 'settings' && <div key="settings" className="view-animate h-full"><SettingsView /></div>}
            {view === 'commands' && <div key="commands" className="view-animate h-full"><CommandsView /></div>}
          </section>
          {terminalOpen && (
            <section className="h-80 shrink-0 border-t border-panel-border">
              <TerminalPanel />
            </section>
          )}
        </main>
      </div>
    </div>
  )
}
