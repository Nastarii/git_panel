import { useEffect, useState } from 'react'
import { useReposStore } from '@/store/reposStore'
import { useAuthStore } from '@/store/authStore'
import { useBoardStore } from '@/store/boardStore'
import { RepoPicker } from './RepoPicker'

export function ReposView() {
  const repos = useReposStore((s) => s.repos)
  const refresh = useReposStore((s) => s.refresh)
  const add = useReposStore((s) => s.add)
  const remove = useReposStore((s) => s.remove)
  const authMode = useAuthStore((s) => s.status?.mode ?? 'none')
  const sync = useBoardStore((s) => s.sync)
  const syncing = useBoardStore((s) => s.syncing)
  const syncErrors = useBoardStore((s) => s.syncErrors)
  const syncError = useBoardStore((s) => s.syncError)
  const lastSyncedCount = useBoardStore((s) => s.lastSyncedCount)
  const lastSyncedAt = useBoardStore((s) => s.lastSyncedAt)

  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [flash, setFlash] = useState<string | null>(null)

  useEffect(() => { void refresh() }, [refresh])

  useEffect(() => {
    if (!flash) return
    const t = setTimeout(() => setFlash(null), 4000)
    return () => clearTimeout(t)
  }, [flash])

  const handleAdd = async (): Promise<void> => {
    setError(null)
    const fullName = input.trim()
    if (!fullName.includes('/')) {
      setError('Use format owner/repo')
      return
    }
    const err = await add(fullName)
    if (err) setError(err)
    else {
      setInput('')
      if (authMode !== 'none') {
        await sync()
        setFlash(`Added ${fullName} — pulled into board.`)
      } else {
        setFlash(`Added ${fullName}. Sign in to GitHub to pull its issues.`)
      }
    }
  }

  const handlePickerAdded = async (count: number): Promise<void> => {
    if (count > 0) {
      await sync()
      setFlash(`Added ${count} repositor${count === 1 ? 'y' : 'ies'} — pulled into board.`)
    }
  }

  return (
    <div className="h-full flex flex-col">
      <header className="flex items-center justify-between border-b border-panel-border px-5 py-3">
        <div>
          <h1 className="text-lg font-semibold">Repositories</h1>
          <p className="text-xs text-panel-muted">
            {authMode === 'none'
              ? 'Sign in with GitHub in Settings to fetch issues and PRs from these repos.'
              : 'Open issues and PRs from these repositories are pulled into your board on sync.'}
          </p>
        </div>
        <div className="flex gap-2">
          {authMode !== 'none' && (
            <button onClick={() => setPickerOpen(true)} className="btn">
              Browse my repos…
            </button>
          )}
          <button
            onClick={() => void sync()}
            disabled={syncing || authMode === 'none' || repos.length === 0}
            className="btn-primary disabled:opacity-50"
          >
            {syncing ? 'Syncing…' : 'Sync all'}
          </button>
        </div>
      </header>

      <div className="p-5 space-y-4 max-w-3xl w-full">
        {flash && (
          <div className="rounded-md border border-panel-success/40 bg-panel-success/10 px-3 py-2 text-xs text-panel-success">
            {flash}
          </div>
        )}
        {syncError && (
          <div className="rounded-md border border-panel-danger/40 bg-panel-danger/10 px-3 py-2 text-xs text-panel-danger">
            Sync failed: {syncError}
          </div>
        )}
        {syncErrors.length > 0 && (
          <div className="rounded-md border border-panel-warning/40 bg-panel-warning/10 px-3 py-2 text-xs text-panel-warning">
            <div className="font-semibold mb-1">Some repositories failed to sync:</div>
            <ul className="space-y-0.5">
              {syncErrors.map((e) => (
                <li key={e.repo}>
                  <span className="font-mono">{e.repo}</span>: {e.message}
                </li>
              ))}
            </ul>
          </div>
        )}
        {lastSyncedAt && !syncError && (
          <div className="text-[10px] text-panel-muted">
            Last sync: {new Date(lastSyncedAt).toLocaleTimeString()} · {lastSyncedCount ?? 0} cards
          </div>
        )}

        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void handleAdd() }}
            placeholder="owner/repo"
            className="flex-1 rounded border border-panel-border bg-panel-bg px-3 py-1.5 text-sm font-mono focus:outline-none focus:border-panel-accent"
          />
          <button onClick={() => void handleAdd()} className="btn-primary">Add</button>
        </div>
        {error && <div className="text-xs text-panel-danger">{error}</div>}

        <div className="space-y-1">
          {repos.length === 0 ? (
            <div className="text-sm text-panel-muted py-6 text-center border border-dashed border-panel-border rounded-md">
              No repositories yet. {authMode !== 'none' ? 'Click "Browse my repos" or' : 'Add a repo by typing'} <span className="font-mono">owner/repo</span> above.
            </div>
          ) : (
            repos.map((repo) => (
              <div
                key={repo.id}
                className="flex items-center justify-between rounded-md border border-panel-border bg-panel-surface/40 px-3 py-2"
              >
                <div>
                  <div className="font-mono text-sm">{repo.fullName}</div>
                  <div className="text-xs text-panel-muted">
                    Added {new Date(repo.addedAt).toLocaleDateString()}
                    {repo.localPath && <> · {repo.localPath}</>}
                  </div>
                </div>
                <button
                  onClick={() => void remove(repo.id)}
                  className="text-xs text-panel-muted hover:text-panel-danger"
                >
                  Remove
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <RepoPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onAdded={(n) => void handlePickerAdded(n)}
      />
    </div>
  )
}
