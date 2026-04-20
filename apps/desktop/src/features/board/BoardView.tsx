import { COLUMNS, COLUMN_LABELS } from '@shared/types/board'

export function BoardView() {
  return (
    <div className="h-full flex flex-col">
      <header className="flex items-center justify-between border-b border-panel-border px-5 py-3">
        <div>
          <h1 className="text-lg font-semibold">Board</h1>
          <p className="text-xs text-panel-muted">Kanban view of open Issues and PRs across watched repositories.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn" disabled title="Phase 2">Sync</button>
          <button className="btn-primary" disabled title="Phase 2">New card</button>
        </div>
      </header>
      <div className="flex-1 grid grid-cols-5 gap-3 p-4 overflow-x-auto min-w-0">
        {COLUMNS.map((id) => (
          <div key={id} className="flex flex-col rounded-lg border border-panel-border bg-panel-surface/30 min-h-0">
            <div className="flex items-center justify-between px-3 py-2 border-b border-panel-border">
              <span className="text-xs font-semibold uppercase tracking-wide text-panel-muted">{COLUMN_LABELS[id]}</span>
              <span className="text-xs text-panel-muted">0</span>
            </div>
            <div className="flex-1 p-2 text-xs text-panel-muted text-center italic">
              drop cards here
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
