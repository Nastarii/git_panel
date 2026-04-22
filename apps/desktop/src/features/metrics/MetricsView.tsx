import { useMemo } from 'react'
import { useBoardStore } from '@/store/boardStore'
import { useReposStore } from '@/store/reposStore'
import { COLUMN_LABELS, type ColumnId, type CardPriority } from '@shared/types/board'

const PRIORITY_ORDER: CardPriority[] = ['urgent', 'high', 'medium', 'low']
const PRIORITY_COLOR: Record<CardPriority, string> = {
  urgent: 'bg-panel-danger',
  high:   'bg-panel-warning',
  medium: 'bg-panel-accent',
  low:    'bg-panel-muted',
}
const PRIORITY_TEXT: Record<CardPriority, string> = {
  urgent: 'text-panel-danger',
  high:   'text-panel-warning',
  medium: 'text-panel-accent',
  low:    'text-panel-muted',
}

const COLUMN_ORDER: ColumnId[] = ['backlog', 'todo', 'in_progress', 'review', 'done']
const COLUMN_COLOR: Record<ColumnId, string> = {
  backlog:     'bg-panel-muted/60',
  todo:        'bg-panel-text/60',
  in_progress: 'bg-panel-accent',
  review:      'bg-panel-warning',
  done:        'bg-panel-success',
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-lg border border-panel-border bg-panel-surface/30 p-4">
      <div className="text-xs text-panel-muted">{label}</div>
      <div className="text-2xl font-semibold mt-1.5 text-panel-text">{value}</div>
      {sub && <div className="text-[10px] text-panel-muted mt-0.5">{sub}</div>}
    </div>
  )
}

export function MetricsView() {
  const cards = useBoardStore((s) => s.cards)
  const lastSyncedAt = useBoardStore((s) => s.lastSyncedAt)
  const repos = useReposStore((s) => s.repos)

  const stats = useMemo(() => {
    const total = cards.length
    const active = cards.filter((c) => c.column !== 'done').length
    const done = cards.filter((c) => c.column === 'done').length
    const inProgress = cards.filter((c) => c.column === 'in_progress').length

    const byColumn = COLUMN_ORDER.reduce<Record<ColumnId, number>>((acc, col) => {
      acc[col] = cards.filter((c) => c.column === col).length
      return acc
    }, {} as Record<ColumnId, number>)

    const githubIssues = cards.filter((c) => c.provider === 'github' && c.type === 'issue').length
    const githubPRs    = cards.filter((c) => c.provider === 'github' && c.type === 'pr').length
    const localTasks   = cards.filter((c) => c.provider === 'local').length

    const byPriority = PRIORITY_ORDER.reduce<Record<CardPriority, number>>((acc, p) => {
      acc[p] = cards.filter((c) => c.priority === p).length
      return acc
    }, {} as Record<CardPriority, number>)

    const labelCounts: Record<string, number> = {}
    for (const card of cards) {
      for (const l of card.labels) {
        labelCounts[l] = (labelCounts[l] ?? 0) + 1
      }
    }
    const topLabels = Object.entries(labelCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)

    return { total, active, done, inProgress, byColumn, githubIssues, githubPRs, localTasks, byPriority, topLabels }
  }, [cards])

  const githubRepos = repos.filter((r) => r.kind === 'github').length

  return (
    <div className="h-full flex flex-col overflow-y-auto">
      <header className="border-b border-panel-border px-5 py-3 shrink-0">
        <h1 className="text-lg font-semibold">Metrics</h1>
        <p className="text-xs text-panel-muted">
          Snapshot of your board across {githubRepos} GitHub repo{githubRepos !== 1 ? 's' : ''} and local tasks.
          {lastSyncedAt && (
            <span className="ml-2">Last sync: {new Date(lastSyncedAt).toLocaleTimeString()}</span>
          )}
        </p>
      </header>

      <div className="p-5 space-y-6 max-w-3xl w-full">
        {/* Summary */}
        <div className="grid grid-cols-4 gap-3">
          <StatCard label="Total cards" value={stats.total} />
          <StatCard label="Active" value={stats.active} sub="not yet done" />
          <StatCard label="In progress" value={stats.inProgress} />
          <StatCard label="Done" value={stats.done} />
        </div>

        {/* Column distribution */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-panel-muted mb-3">
            Board distribution
          </h2>
          <div className="space-y-2">
            {COLUMN_ORDER.map((col) => {
              const count = stats.byColumn[col]
              const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0
              return (
                <div key={col} className="flex items-center gap-3">
                  <span className="w-24 text-xs text-panel-muted shrink-0">{COLUMN_LABELS[col]}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-panel-border overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${COLUMN_COLOR[col]}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-6 text-right text-xs text-panel-muted shrink-0">{count}</span>
                </div>
              )
            })}
          </div>
        </section>

        {/* Source + Priority */}
        <div className="grid grid-cols-2 gap-4">
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-panel-muted mb-3">
              By source
            </h2>
            <div className="rounded-lg border border-panel-border bg-panel-surface/30 divide-y divide-panel-border">
              {[
                { label: 'GitHub issues', value: stats.githubIssues },
                { label: 'GitHub PRs',    value: stats.githubPRs },
                { label: 'Local tasks',   value: stats.localTasks },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between px-3 py-2">
                  <span className="text-xs text-panel-muted">{label}</span>
                  <span className="text-sm font-semibold text-panel-text">{value}</span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-panel-muted mb-3">
              By priority
            </h2>
            <div className="rounded-lg border border-panel-border bg-panel-surface/30 divide-y divide-panel-border">
              {PRIORITY_ORDER.map((p) => {
                const count = stats.byPriority[p]
                return (
                  <div key={p} className="flex items-center justify-between px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${PRIORITY_COLOR[p]}`} />
                      <span className={`text-xs capitalize ${PRIORITY_TEXT[p]}`}>{p}</span>
                    </div>
                    <span className="text-sm font-semibold text-panel-text">{count}</span>
                  </div>
                )
              })}
            </div>
          </section>
        </div>

        {/* Top labels */}
        {stats.topLabels.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-panel-muted mb-3">
              Top labels
            </h2>
            <div className="flex flex-wrap gap-2">
              {stats.topLabels.map(([label, count]) => (
                <span
                  key={label}
                  className="flex items-center gap-1.5 rounded border border-panel-border bg-panel-surface px-2 py-1 text-xs text-panel-muted"
                >
                  {label}
                  <span className="font-semibold text-panel-text">{count}</span>
                </span>
              ))}
            </div>
          </section>
        )}

        {stats.total === 0 && (
          <div className="py-12 text-center text-sm text-panel-muted">
            No cards on the board yet. Add a GitHub repo or create a local task to get started.
          </div>
        )}
      </div>
    </div>
  )
}
