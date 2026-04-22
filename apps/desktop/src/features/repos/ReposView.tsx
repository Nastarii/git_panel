import { useEffect, useMemo, useState } from 'react'
import { FolderOpen, FolderCheck } from 'lucide-react'
import { useReposStore } from '@/store/reposStore'
import { useAuthStore } from '@/store/authStore'
import { useBoardStore } from '@/store/boardStore'
import { RepoPicker } from './RepoPicker'
import type { WatchedRepo } from '@shared/types/github'

export function ReposView() {
  const repos = useReposStore((s) => s.repos)
  const refresh = useReposStore((s) => s.refresh)
  const addGithub = useReposStore((s) => s.addGithub)
  const addLocal = useReposStore((s) => s.addLocal)
  const remove = useReposStore((s) => s.remove)
  const setLocalPath = useReposStore((s) => s.setLocalPath)

  const authMode = useAuthStore((s) => s.status?.mode ?? 'none')
  const sync = useBoardStore((s) => s.sync)
  const syncing = useBoardStore((s) => s.syncing)
  const syncErrors = useBoardStore((s) => s.syncErrors)
  const syncError = useBoardStore((s) => s.syncError)
  const lastSyncedCount = useBoardStore((s) => s.lastSyncedCount)
  const lastSyncedAt = useBoardStore((s) => s.lastSyncedAt)

  const [githubInput, setGithubInput] = useState('')
  const [localName, setLocalName] = useState('')
  const [localPath, setLocalPathInput] = useState<string | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [flash, setFlash] = useState<string | null>(null)

  useEffect(() => { void refresh() }, [refresh])
  useEffect(() => {
    if (!flash) return
    const t = setTimeout(() => setFlash(null), 4000)
    return () => clearTimeout(t)
  }, [flash])

  const { githubRepos, localRepos } = useMemo(() => ({
    githubRepos: repos.filter((r) => r.kind === 'github'),
    localRepos: repos.filter((r) => r.kind === 'local'),
  }), [repos])

  const handleAddGithub = async (): Promise<void> => {
    setError(null)
    const fullName = githubInput.trim()
    if (!fullName.includes('/')) {
      setError('Use format owner/repo for GitHub repositories')
      return
    }
    const err = await addGithub(fullName)
    if (err) setError(err)
    else {
      setGithubInput('')
      if (authMode !== 'none') {
        await sync()
        setFlash(`Added ${fullName} — pulled into board.`)
      } else {
        setFlash(`Added ${fullName}. Sign in to GitHub to sync its issues.`)
      }
    }
  }

  const handleAddLocal = async (): Promise<void> => {
    setError(null)
    const name = localName.trim()
    if (!name) {
      setError('Local project name is required')
      return
    }
    const err = await addLocal(name, localPath)
    if (err) setError(err)
    else {
      setLocalName('')
      setLocalPathInput(undefined)
      setFlash(`Added local project "${name}".`)
    }
  }

  const pickFolder = async (setter: (path: string | undefined) => void): Promise<void> => {
    const res = await window.api.dialog.selectDirectory()
    if (res.data) setter(res.data)
  }

  const handleRepoFolder = async (repo: WatchedRepo): Promise<void> => {
    const res = await window.api.dialog.selectDirectory(repo.localPath)
    if (res.data) await setLocalPath(repo.id, res.data)
  }

  const clearRepoFolder = (repo: WatchedRepo): Promise<void> => setLocalPath(repo.id, null)

  const handlePickerAdded = async (count: number): Promise<void> => {
    if (count > 0) {
      await sync()
      setFlash(`Added ${count} repositor${count === 1 ? 'y' : 'ies'} — pulled into board.`)
    }
  }

  return (
    <div className="h-full flex flex-col overflow-y-auto">
      <header className="flex items-center justify-between border-b border-panel-border px-5 py-3">
        <div>
          <h1 className="text-lg font-semibold">Projects</h1>
          <p className="text-xs text-panel-muted">
            GitHub repositories and local-only projects. Link any of them to a folder on disk.
          </p>
        </div>
        <div className="flex gap-2">
          {authMode !== 'none' && (
            <button onClick={() => setPickerOpen(true)} className="btn">Browse my repos…</button>
          )}
          <button
            onClick={() => void sync()}
            disabled={syncing || authMode === 'none' || githubRepos.length === 0}
            className="btn-primary disabled:opacity-50"
          >
            {syncing ? 'Syncing…' : 'Sync GitHub'}
          </button>
        </div>
      </header>

      <div className="p-5 space-y-6 max-w-3xl w-full">
        {flash && (
          <div className="rounded-md border border-panel-success/40 bg-panel-success/10 px-3 py-2 text-xs text-panel-success">{flash}</div>
        )}
        {syncError && (
          <div className="rounded-md border border-panel-danger/40 bg-panel-danger/10 px-3 py-2 text-xs text-panel-danger">Sync failed: {syncError}</div>
        )}
        {syncErrors.length > 0 && (
          <div className="rounded-md border border-panel-warning/40 bg-panel-warning/10 px-3 py-2 text-xs text-panel-warning">
            <div className="font-semibold mb-1">Some repositories failed to sync:</div>
            <ul className="space-y-0.5">
              {syncErrors.map((e) => (
                <li key={e.repo}><span className="font-mono">{e.repo}</span>: {e.message}</li>
              ))}
            </ul>
          </div>
        )}
        {lastSyncedAt && !syncError && (
          <div className="text-[10px] text-panel-muted">
            Last sync: {new Date(lastSyncedAt).toLocaleTimeString()} · {lastSyncedCount ?? 0} cards
          </div>
        )}

        {/* ---- GitHub repos ---- */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-panel-muted mb-2">
            GitHub repositories
          </h2>
          <div className="flex gap-2">
            <input
              value={githubInput}
              onChange={(e) => setGithubInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void handleAddGithub() }}
              placeholder="owner/repo"
              className="flex-1 rounded border border-panel-border bg-panel-bg px-3 py-1.5 text-sm font-mono focus:outline-none focus:border-panel-accent"
            />
            <button onClick={() => void handleAddGithub()} className="btn-solid">Add</button>
          </div>
          <div className="mt-3 space-y-1">
            {githubRepos.length === 0 ? (
              <div className="text-xs text-panel-muted italic py-3 text-center border border-dashed border-panel-border rounded-md">
                No GitHub repositories yet.
              </div>
            ) : (
              githubRepos.map((repo) => (
                <RepoRow
                  key={repo.id}
                  repo={repo}
                  onPickFolder={() => void handleRepoFolder(repo)}
                  onClearFolder={() => void clearRepoFolder(repo)}
                  onRemove={() => void remove(repo.id)}
                />
              ))
            )}
          </div>
        </section>

        {/* ---- Local projects ---- */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-panel-muted mb-2">
            Local projects
          </h2>
          <p className="text-[11px] text-panel-muted mb-2">
            Tasks-only projects not tied to GitHub. Great for personal notes, Obsidian vaults, or anything you don't want synced.
          </p>
          <div className="flex gap-2">
            <input
              value={localName}
              onChange={(e) => setLocalName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void handleAddLocal() }}
              placeholder="Project name (e.g. Obsidian Notes)"
              className="flex-1 rounded border border-panel-border bg-panel-bg px-3 py-1.5 text-sm focus:outline-none focus:border-panel-accent"
            />
            <button onClick={() => void pickFolder(setLocalPathInput)} className="btn" title="Link a folder">
              {localPath ? <><FolderCheck size={14} /> linked</> : <><FolderOpen size={14} /> Folder</>}
            </button>
            <button onClick={() => void handleAddLocal()} className="btn-solid">Add</button>
          </div>
          {localPath && (
            <div className="mt-1 text-[10px] text-panel-muted font-mono truncate">{localPath}</div>
          )}
          <div className="mt-3 space-y-1">
            {localRepos.length === 0 ? (
              <div className="text-xs text-panel-muted italic py-3 text-center border border-dashed border-panel-border rounded-md">
                No local projects yet.
              </div>
            ) : (
              localRepos.map((repo) => (
                <RepoRow
                  key={repo.id}
                  repo={repo}
                  onPickFolder={() => void handleRepoFolder(repo)}
                  onClearFolder={() => void clearRepoFolder(repo)}
                  onRemove={() => void remove(repo.id)}
                />
              ))
            )}
          </div>
        </section>

        {error && <div className="text-xs text-panel-danger">{error}</div>}
      </div>

      <RepoPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onAdded={(n) => void handlePickerAdded(n)}
      />
    </div>
  )
}

function RepoRow({
  repo,
  onPickFolder,
  onClearFolder,
  onRemove,
}: {
  repo: WatchedRepo
  onPickFolder: () => void
  onClearFolder: () => void
  onRemove: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-panel-border bg-panel-surface/40 px-3 py-2">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={repo.kind === 'github' ? 'font-mono text-sm' : 'text-sm font-medium'}>
            {repo.fullName}
          </span>
          <span
            className={
              repo.kind === 'github'
                ? 'rounded bg-panel-accent/10 px-1.5 py-0.5 text-[10px] text-panel-accent'
                : 'rounded bg-panel-muted/10 px-1.5 py-0.5 text-[10px] text-panel-muted'
            }
          >
            {repo.kind}
          </span>
        </div>
        <div className="text-[11px] text-panel-muted flex items-center gap-2">
          <span>Added {new Date(repo.addedAt).toLocaleDateString()}</span>
          {repo.localPath ? (
            <span className="font-mono truncate" title={repo.localPath}>· {repo.localPath}</span>
          ) : (
            <span className="italic">· no folder linked</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={onPickFolder} className="text-xs text-panel-muted hover:text-panel-accent" title="Link folder">
          {repo.localPath ? 'Change folder' : 'Link folder'}
        </button>
        {repo.localPath && (
          <button onClick={onClearFolder} className="text-xs text-panel-muted hover:text-panel-danger" title="Unlink folder">
            Unlink
          </button>
        )}
        <button onClick={onRemove} className="text-xs text-panel-muted hover:text-panel-danger">
          Remove
        </button>
      </div>
    </div>
  )
}
