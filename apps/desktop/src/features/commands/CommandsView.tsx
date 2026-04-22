import { useEffect, useState } from 'react'
import { useCommandsStore, type SavedCommand } from '@/store/commandsStore'
import { useReposStore } from '@/store/reposStore'
import { useTerminalStore } from '@/store/terminalStore'
import { useUIStore } from '@/store/uiStore'

export function CommandsView() {
  const commands = useCommandsStore((s) => s.commands)
  const loading = useCommandsStore((s) => s.loading)
  const load = useCommandsStore((s) => s.load)
  const add = useCommandsStore((s) => s.add)
  const remove = useCommandsStore((s) => s.remove)
  const update = useCommandsStore((s) => s.update)

  const repos = useReposStore((s) => s.repos)
  const refreshRepos = useReposStore((s) => s.refresh)

  const openTab = useTerminalStore((s) => s.openTab)
  const setTerminalOpen = useUIStore((s) => s.setTerminalOpen)

  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [command, setCommand] = useState('')
  const [repoId, setRepoId] = useState('')
  const [running, setRunning] = useState<string | null>(null)

  useEffect(() => {
    void load()
    void refreshRepos()
  }, [load, refreshRepos])

  const reposWithPath = repos.filter((r) => r.localPath)

  const resetForm = () => {
    setName('')
    setCommand('')
    setRepoId('')
    setEditingId(null)
    setFormOpen(false)
  }

  const openCreate = () => {
    resetForm()
    setFormOpen(true)
  }

  const openEdit = (cmd: SavedCommand) => {
    setEditingId(cmd.id)
    setName(cmd.name)
    setCommand(cmd.command)
    setRepoId(cmd.repoId ?? '')
    setFormOpen(true)
  }

  const handleSave = async () => {
    const trimmed = name.trim()
    const trimmedCmd = command.trim()
    if (!trimmed || !trimmedCmd) return

    if (editingId) {
      await update(editingId, {
        name: trimmed,
        command: trimmedCmd,
        repoId: repoId || undefined,
      })
    } else {
      await add({
        name: trimmed,
        command: trimmedCmd,
        repoId: repoId || undefined,
      })
    }
    resetForm()
  }

  const handleRun = async (cmd: SavedCommand) => {
    const repo = cmd.repoId ? repos.find((r) => r.id === cmd.repoId) : undefined
    const cwd = repo?.localPath ?? undefined

    setRunning(cmd.id)
    setTerminalOpen(true)
    await openTab(cwd, cmd.name, undefined, cmd.command)
    setRunning(null)
  }

  return (
    <div className="h-full flex flex-col overflow-y-auto">
      <header className="flex items-center justify-between border-b border-panel-border px-5 py-3">
        <div>
          <h1 className="text-lg font-semibold">Commands</h1>
          <p className="text-xs text-panel-muted">
            Save commands and run them in a new terminal tab with one click.
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          + New command
        </button>
      </header>

      <div className="p-5 space-y-4 max-w-3xl w-full">
        {formOpen && (
          <div className="rounded-md border border-panel-border bg-panel-surface/60 p-4 space-y-3">
            <h2 className="text-sm font-semibold">
              {editingId ? 'Edit command' : 'New command'}
            </h2>

            <div className="space-y-2">
              <div>
                <label className="block text-xs text-panel-muted mb-1">Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Dev Server"
                  className="w-full rounded border border-panel-border bg-panel-bg px-3 py-1.5 text-sm focus:outline-none focus:border-panel-accent"
                />
              </div>

              <div>
                <label className="block text-xs text-panel-muted mb-1">Command</label>
                <input
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') void handleSave() }}
                  placeholder="e.g. npm run dev"
                  className="w-full rounded border border-panel-border bg-panel-bg px-3 py-1.5 text-sm font-mono focus:outline-none focus:border-panel-accent"
                />
              </div>

              <div>
                <label className="block text-xs text-panel-muted mb-1">
                  Project <span className="font-normal">(optional — sets the working directory)</span>
                </label>
                <select
                  value={repoId}
                  onChange={(e) => setRepoId(e.target.value)}
                  className="w-full rounded border border-panel-border bg-panel-bg px-3 py-1.5 text-sm focus:outline-none focus:border-panel-accent"
                >
                  <option value="">No project (home directory)</option>
                  {reposWithPath.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.fullName} — {r.localPath}
                    </option>
                  ))}
                  {repos.filter((r) => !r.localPath).map((r) => (
                    <option key={r.id} value={r.id} disabled>
                      {r.fullName} (no folder linked)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <button onClick={resetForm} className="btn">Cancel</button>
              <button
                onClick={() => void handleSave()}
                disabled={!name.trim() || !command.trim()}
                className="btn-primary disabled:opacity-50"
              >
                {editingId ? 'Save changes' : 'Create'}
              </button>
            </div>
          </div>
        )}

        {loading && (
          <div className="text-xs text-panel-muted text-center py-6">Loading…</div>
        )}

        {!loading && commands.length === 0 && !formOpen && (
          <div className="text-xs text-panel-muted italic py-8 text-center border border-dashed border-panel-border rounded-md">
            No commands yet. Click <strong>+ New command</strong> to create one.
          </div>
        )}

        {commands.map((cmd) => (
          <CommandRow
            key={cmd.id}
            cmd={cmd}
            repoLabel={repos.find((r) => r.id === cmd.repoId)?.fullName}
            repoCwd={repos.find((r) => r.id === cmd.repoId)?.localPath}
            running={running === cmd.id}
            onRun={() => void handleRun(cmd)}
            onEdit={() => openEdit(cmd)}
            onRemove={() => void remove(cmd.id)}
          />
        ))}
      </div>
    </div>
  )
}

function CommandRow({
  cmd,
  repoLabel,
  repoCwd,
  running,
  onRun,
  onEdit,
  onRemove,
}: {
  cmd: SavedCommand
  repoLabel?: string
  repoCwd?: string
  running: boolean
  onRun: () => void
  onEdit: () => void
  onRemove: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md border border-panel-border bg-panel-surface/40 px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{cmd.name}</span>
          {repoLabel && (
            <span className="rounded bg-panel-accent/10 px-1.5 py-0.5 text-[10px] text-panel-accent truncate max-w-[160px]">
              {repoLabel}
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-3 text-[11px] text-panel-muted">
          <code className="font-mono text-panel-text/80">{cmd.command}</code>
          {repoCwd && (
            <span className="font-mono truncate max-w-[240px]" title={repoCwd}>
              · {repoCwd}
            </span>
          )}
          {cmd.repoId && !repoCwd && (
            <span className="italic">· no folder linked</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onRun}
          disabled={running}
          className="btn-primary text-xs px-3 py-1 disabled:opacity-50"
          title="Open a new terminal tab and run this command"
        >
          {running ? 'Opening…' : '▶ Run'}
        </button>
        <button
          onClick={onEdit}
          className="text-xs text-panel-muted hover:text-panel-accent"
        >
          Edit
        </button>
        <button
          onClick={onRemove}
          className="text-xs text-panel-muted hover:text-panel-danger"
        >
          Remove
        </button>
      </div>
    </div>
  )
}
