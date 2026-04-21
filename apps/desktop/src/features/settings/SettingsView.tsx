import { useEffect, useState } from 'react'
import { GitHubAuthSection } from './GitHubAuthSection'

function TerminalSection() {
  const [defaultCwd, setDefaultCwd] = useState<string>('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    void window.api.store.get<{ 'terminal.defaultCwd'?: string }>('settings').then((res) => {
      if (res.data) setDefaultCwd((res.data as Record<string, unknown>)['terminal.defaultCwd'] as string ?? '')
    })
  }, [])

  const pick = async () => {
    const res = await window.api.dialog.selectDirectory(defaultCwd || undefined)
    if (res.data) {
      setDefaultCwd(res.data)
      setSaved(false)
    }
  }

  const save = async () => {
    const res = await window.api.store.get<Record<string, unknown>>('settings')
    const current = (res.data as Record<string, unknown>) ?? {}
    await window.api.store.set('settings', { ...current, 'terminal.defaultCwd': defaultCwd || undefined })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const clear = async () => {
    const res = await window.api.store.get<Record<string, unknown>>('settings')
    const current = (res.data as Record<string, unknown>) ?? {}
    delete current['terminal.defaultCwd']
    await window.api.store.set('settings', current)
    setDefaultCwd('')
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <section>
      <h2 className="text-sm font-semibold mb-2">Terminal</h2>
      <p className="text-xs text-panel-muted mb-3">
        Shell is auto-resolved from <code className="font-mono text-[10px]">SHELL</code> / <code className="font-mono text-[10px]">COMSPEC</code>.
        Set a default working directory so new tabs open in the right place.
      </p>
      <label className="block mb-1 text-xs text-panel-muted">Default working directory</label>
      <div className="flex gap-2 items-center">
        <input
          readOnly
          value={defaultCwd}
          placeholder="Home directory (default)"
          className="flex-1 rounded border border-panel-border bg-panel-bg px-2 py-1.5 text-xs font-mono focus:outline-none text-panel-text placeholder:text-panel-muted/50"
        />
        <button onClick={() => void pick()} className="btn text-xs">Browse</button>
        {defaultCwd && (
          <button onClick={() => void save()} className="btn-primary text-xs">
            {saved ? 'Saved ✓' : 'Save'}
          </button>
        )}
        {defaultCwd && (
          <button onClick={() => void clear()} className="btn text-xs text-panel-danger hover:border-panel-danger">
            Reset
          </button>
        )}
      </div>
      <p className="text-[10px] text-panel-muted mt-1.5">
        Takes effect on the next terminal tab you open.
      </p>
    </section>
  )
}

export function SettingsView() {
  return (
    <div className="h-full flex flex-col overflow-y-auto">
      <header className="border-b border-panel-border px-5 py-3">
        <h1 className="text-lg font-semibold">Settings</h1>
        <p className="text-xs text-panel-muted">GitHub auth, cloud mode, terminal defaults.</p>
      </header>
      <div className="p-5 space-y-8 max-w-2xl w-full">
        <section>
          <h2 className="text-sm font-semibold mb-3">GitHub</h2>
          <GitHubAuthSection />
        </section>

        <section>
          <h2 className="text-sm font-semibold mb-2">Cloud mode</h2>
          <p className="text-xs text-panel-muted mb-2">
            Sync your board across devices and collaborate with a team through a self-hostable GitPanel API.
          </p>
          <button className="btn" disabled>Connect to API (Phase 3)</button>
        </section>

        <TerminalSection />

        <section>
          <h2 className="text-sm font-semibold mb-2">Storage</h2>
          <p className="text-xs text-panel-muted">
            Local cards and board overrides are stored via <code className="font-mono text-[10px]">electron-store</code> under your user profile.
            Tokens are encrypted with OS keystore (<code className="font-mono text-[10px]">safeStorage</code>).
          </p>
        </section>
      </div>
    </div>
  )
}
