import { useEffect, useState } from 'react'
import { useReposStore } from '@/store/reposStore'
import { useAuthStore } from '@/store/authStore'
import { useBoardStore } from '@/store/boardStore'

export function ReposView() {
  const repos = useReposStore((s) => s.repos)
  const refresh = useReposStore((s) => s.refresh)
  const add = useReposStore((s) => s.add)
  const remove = useReposStore((s) => s.remove)
  const authMode = useAuthStore((s) => s.status?.mode ?? 'none')
  const sync = useBoardStore((s) => s.sync)
  const syncing = useBoardStore((s) => s.syncing)

  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { void refresh() }, [refresh])

  const handleAdd = async () => {
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
      if (authMode !== 'none') void sync()
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
        <button
          onClick={() => void sync()}
          disabled={syncing || authMode === 'none'}
          className="btn disabled:opacity-50"
        >
          {syncing ? 'Syncing…' : 'Sync all'}
        </button>
      </header>

      <div className="p-5 space-y-4 max-w-3xl w-full">
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
              No repositories yet. Add one above.
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
    </div>
  )
}
