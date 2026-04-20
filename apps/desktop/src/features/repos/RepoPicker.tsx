import { useEffect, useMemo, useState } from 'react'
import clsx from 'clsx'
import { useReposStore } from '@/store/reposStore'

type RepoSummary = {
  id: number
  fullName: string
  owner: string
  name: string
  private: boolean
  description?: string
  defaultBranch: string
  updatedAt: string | null
  openIssues: number
  archived: boolean
}

type Props = {
  open: boolean
  onClose: () => void
  onAdded?: (count: number) => void
}

export function RepoPicker({ open, onClose, onAdded }: Props) {
  const watched = useReposStore((s) => s.repos)
  const add = useReposStore((s) => s.add)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [repos, setRepos] = useState<RepoSummary[]>([])
  const [filter, setFilter] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    setError(null)
    setSelected(new Set())
    void window.api.github.listMyRepos().then((res) => {
      if (res.data) setRepos(res.data)
      else setError(res.error?.message ?? 'Failed to load repositories')
      setLoading(false)
    })
  }, [open])

  const watchedNames = useMemo(
    () => new Set(watched.map((r) => r.fullName.toLowerCase())),
    [watched],
  )

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase()
    const list = q
      ? repos.filter(
          (r) =>
            r.fullName.toLowerCase().includes(q) ||
            (r.description ?? '').toLowerCase().includes(q),
        )
      : repos
    return list
  }, [repos, filter])

  const toggle = (fullName: string): void => {
    if (watchedNames.has(fullName.toLowerCase())) return
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(fullName)) next.delete(fullName)
      else next.add(fullName)
      return next
    })
  }

  const confirm = async (): Promise<void> => {
    if (selected.size === 0) return
    setAdding(true)
    let count = 0
    for (const fullName of selected) {
      const err = await add(fullName)
      if (!err) count++
    }
    setAdding(false)
    onAdded?.(count)
    onClose()
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-lg border border-panel-border bg-panel-surface shadow-2xl flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-panel-border px-4 py-3">
          <h2 className="text-sm font-semibold">Add from my GitHub repositories</h2>
          <button onClick={onClose} className="text-panel-muted hover:text-panel-text">×</button>
        </div>

        <div className="border-b border-panel-border p-3">
          <input
            autoFocus
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter repositories…"
            className="w-full rounded border border-panel-border bg-panel-bg px-3 py-1.5 text-sm focus:outline-none focus:border-panel-accent"
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="p-6 text-center text-sm text-panel-muted">Loading repositories…</div>
          )}
          {error && (
            <div className="p-4 text-sm text-panel-danger">{error}</div>
          )}
          {!loading && !error && filtered.length === 0 && (
            <div className="p-6 text-center text-sm text-panel-muted">No repositories found.</div>
          )}
          {filtered.map((repo) => {
            const alreadyWatched = watchedNames.has(repo.fullName.toLowerCase())
            const isSelected = selected.has(repo.fullName)
            return (
              <div
                key={repo.id}
                onClick={() => toggle(repo.fullName)}
                className={clsx(
                  'flex items-start gap-3 border-b border-panel-border px-4 py-2.5 text-sm',
                  alreadyWatched
                    ? 'opacity-50 cursor-not-allowed'
                    : 'cursor-pointer hover:bg-panel-bg/60',
                  isSelected && 'bg-panel-accent/5',
                )}
              >
                <input
                  type="checkbox"
                  checked={alreadyWatched || isSelected}
                  disabled={alreadyWatched}
                  readOnly
                  className="mt-1"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono truncate">{repo.fullName}</span>
                    {repo.private && (
                      <span className="rounded bg-panel-muted/10 px-1.5 py-0.5 text-[10px] text-panel-muted">
                        private
                      </span>
                    )}
                    {repo.archived && (
                      <span className="rounded bg-panel-warning/10 px-1.5 py-0.5 text-[10px] text-panel-warning">
                        archived
                      </span>
                    )}
                    {alreadyWatched && (
                      <span className="rounded bg-panel-success/10 px-1.5 py-0.5 text-[10px] text-panel-success">
                        added
                      </span>
                    )}
                  </div>
                  {repo.description && (
                    <div className="text-xs text-panel-muted truncate mt-0.5">{repo.description}</div>
                  )}
                  <div className="text-[10px] text-panel-muted mt-1">
                    {repo.openIssues} open · updated{' '}
                    {repo.updatedAt ? new Date(repo.updatedAt).toLocaleDateString() : '—'}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex items-center justify-between border-t border-panel-border px-4 py-3">
          <div className="text-xs text-panel-muted">
            {selected.size > 0
              ? `${selected.size} selected`
              : loading
              ? ''
              : `${filtered.length} repositories`}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn">Cancel</button>
            <button
              onClick={() => void confirm()}
              disabled={selected.size === 0 || adding}
              className="btn-primary disabled:opacity-50"
            >
              {adding ? 'Adding…' : `Add ${selected.size || ''}`.trim()}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
