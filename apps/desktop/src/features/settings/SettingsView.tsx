export function SettingsView() {
  return (
    <div className="h-full flex flex-col">
      <header className="border-b border-panel-border px-5 py-3">
        <h1 className="text-lg font-semibold">Settings</h1>
        <p className="text-xs text-panel-muted">GitHub auth, cloud mode, terminal defaults.</p>
      </header>
      <div className="p-5 space-y-6 max-w-xl">
        <section>
          <h2 className="text-sm font-semibold mb-2">GitHub</h2>
          <button className="btn" disabled>Sign in with GitHub (Phase 2)</button>
        </section>
        <section>
          <h2 className="text-sm font-semibold mb-2">Cloud mode</h2>
          <button className="btn" disabled>Connect to API (Phase 3)</button>
        </section>
        <section>
          <h2 className="text-sm font-semibold mb-2">Terminal</h2>
          <p className="text-xs text-panel-muted">Shell is auto-resolved from <code className="font-mono">SHELL</code> / <code className="font-mono">COMSPEC</code>.</p>
        </section>
      </div>
    </div>
  )
}
