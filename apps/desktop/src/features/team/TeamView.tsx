export function TeamView() {
  return (
    <div className="h-full flex flex-col">
      <header className="border-b border-panel-border px-5 py-3">
        <h1 className="text-lg font-semibold">Team</h1>
        <p className="text-xs text-panel-muted">Workspaces and members (cloud mode — Phase 3).</p>
      </header>
      <div className="p-5 text-sm text-panel-muted">
        <p>Cloud mode not configured. Connect a GitPanel API instance in Settings.</p>
      </div>
    </div>
  )
}
