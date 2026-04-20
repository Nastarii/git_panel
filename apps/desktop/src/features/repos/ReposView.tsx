export function ReposView() {
  return (
    <div className="h-full flex flex-col">
      <header className="border-b border-panel-border px-5 py-3">
        <h1 className="text-lg font-semibold">Repositories</h1>
        <p className="text-xs text-panel-muted">Watched GitHub repos — add a repo to start tracking Issues and PRs.</p>
      </header>
      <div className="p-5 text-sm text-panel-muted">
        <p>No repositories yet. Sign in to GitHub to add one (Phase 2).</p>
      </div>
    </div>
  )
}
