import { useEffect, useMemo, useState } from 'react'
import type { BoardCard, CardPriority } from '@shared/types/board'
import { useBoardStore } from '@/store/boardStore'
import { useReposStore } from '@/store/reposStore'

type Props = {
  open: boolean
  card: BoardCard | null   // null => create new
  onClose: () => void
}

const PRIORITIES: CardPriority[] = ['low', 'medium', 'high', 'urgent']

export function CardDialog({ open, card, onClose }: Props) {
  const createLocal = useBoardStore((s) => s.createLocal)
  const updateLocal = useBoardStore((s) => s.updateLocal)
  const deleteLocal = useBoardStore((s) => s.deleteLocal)
  const addCardFromGithub = useBoardStore((s) => s.addCardFromGithub)
  const repos = useReposStore((s) => s.repos)
  const refreshRepos = useReposStore((s) => s.refresh)

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [labels, setLabels] = useState('')
  const [priority, setPriority] = useState<CardPriority | ''>('')
  const [repoId, setRepoId] = useState<string>('')   // empty = no project
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    void refreshRepos()
    setTitle(card?.title ?? '')
    setBody(card?.body ?? '')
    setLabels(card?.labels.join(', ') ?? '')
    setPriority(card?.priority ?? '')
    setRepoId(card?.repoId ?? '')
    setError(null)
    setSubmitting(false)
  }, [open, card, refreshRepos])

  const selectedRepo = useMemo(
    () => (repoId ? repos.find((r) => r.id === repoId) : undefined),
    [repoId, repos],
  )

  if (!open) return null

  const isGithubCard = card?.provider === 'github'
  const isEdit = !!card

  const save = async (): Promise<void> => {
    setError(null)
    const labelList = labels.split(',').map((s) => s.trim()).filter(Boolean)
    const trimmedTitle = title.trim()
    if (!trimmedTitle) return

    setSubmitting(true)
    try {
      // Editing a local card — plain local update (repoId stays editable).
      if (isEdit && !isGithubCard) {
        await updateLocal(card.id, {
          title: trimmedTitle,
          body: body || undefined,
          labels: labelList,
          priority: (priority || undefined) as CardPriority | undefined,
          repoId: repoId || undefined,
        })
        onClose()
        return
      }

      // Creating a new card.
      if (!isEdit) {
        // If linked to a GitHub repo -> promote straight to a real Issue.
        if (selectedRepo?.kind === 'github') {
          const res = await window.api.github.createIssue(selectedRepo.fullName, {
            title: trimmedTitle,
            body: body || undefined,
            labels: labelList,
          })
          if (!res.data) {
            setError(res.error?.message ?? 'Failed to create GitHub issue')
            return
          }
          addCardFromGithub({ ...res.data, repoId: selectedRepo.id })
          onClose()
          return
        }

        // Local (possibly attached to a local project).
        await createLocal({
          title: trimmedTitle,
          body: body || undefined,
          labels: labelList,
          priority: (priority || undefined) as CardPriority | undefined,
          column: 'backlog',
          repoId: repoId || undefined,
        })
        onClose()
      }
    } finally {
      setSubmitting(false)
    }
  }

  const remove = async (): Promise<void> => {
    if (!card || isGithubCard) return
    if (confirm(`Delete "${card.title}"?`)) {
      await deleteLocal(card.id)
      onClose()
    }
  }

  const promotingToGithub = !isEdit && selectedRepo?.kind === 'github'

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-lg border border-panel-border bg-panel-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-panel-border px-4 py-3">
          <h2 className="text-sm font-semibold">
            {isEdit ? (isGithubCard ? card.title : 'Edit task') : 'New task'}
          </h2>
          <button onClick={onClose} className="text-panel-muted hover:text-panel-text">×</button>
        </div>

        {isGithubCard && card ? (
          <div className="p-4 space-y-3 text-sm">
            <div className="font-mono text-xs text-panel-muted">{card.repo}</div>
            {card.body && (
              <p className="whitespace-pre-wrap text-panel-text text-xs max-h-64 overflow-y-auto">
                {card.body}
              </p>
            )}
            {card.url && (
              <a
                href={card.url}
                target="_blank"
                rel="noreferrer"
                className="text-panel-accent text-xs hover:underline"
              >
                Open on GitHub →
              </a>
            )}
            <div className="pt-2 text-xs text-panel-muted">
              GitHub cards are read-only. Drag to move between columns.
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            <label className="block">
              <span className="text-xs text-panel-muted">Title</span>
              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 w-full rounded border border-panel-border bg-panel-bg px-2 py-1.5 text-sm focus:outline-none focus:border-panel-accent"
                placeholder="What needs doing?"
              />
            </label>
            <label className="block">
              <span className="text-xs text-panel-muted">Description</span>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                className="mt-1 w-full rounded border border-panel-border bg-panel-bg px-2 py-1.5 text-sm focus:outline-none focus:border-panel-accent"
              />
            </label>

            <label className="block">
              <span className="text-xs text-panel-muted flex items-center justify-between">
                <span>Project / Repository</span>
                {promotingToGithub && (
                  <span className="text-panel-accent">will create GitHub issue on save</span>
                )}
              </span>
              <select
                value={repoId}
                onChange={(e) => setRepoId(e.target.value)}
                disabled={isEdit && !!card?.repoId && repos.find((r) => r.id === card.repoId)?.kind === 'github'}
                className="mt-1 w-full rounded border border-panel-border bg-panel-bg px-2 py-1.5 text-sm focus:outline-none focus:border-panel-accent disabled:opacity-60"
              >
                <option value="">— None (general task) —</option>
                {repos.some((r) => r.kind === 'github') && (
                  <optgroup label="GitHub">
                    {repos.filter((r) => r.kind === 'github').map((r) => (
                      <option key={r.id} value={r.id}>{r.fullName}</option>
                    ))}
                  </optgroup>
                )}
                {repos.some((r) => r.kind === 'local') && (
                  <optgroup label="Local projects">
                    {repos.filter((r) => r.kind === 'local').map((r) => (
                      <option key={r.id} value={r.id}>{r.fullName}</option>
                    ))}
                  </optgroup>
                )}
              </select>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs text-panel-muted">Labels (comma separated)</span>
                <input
                  value={labels}
                  onChange={(e) => setLabels(e.target.value)}
                  className="mt-1 w-full rounded border border-panel-border bg-panel-bg px-2 py-1.5 text-sm focus:outline-none focus:border-panel-accent"
                />
              </label>
              <label className="block">
                <span className="text-xs text-panel-muted">
                  Priority {promotingToGithub && <span className="text-panel-muted/70">(local only)</span>}
                </span>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as CardPriority | '')}
                  disabled={promotingToGithub}
                  className="mt-1 w-full rounded border border-panel-border bg-panel-bg px-2 py-1.5 text-sm focus:outline-none focus:border-panel-accent disabled:opacity-60"
                >
                  <option value="">—</option>
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </label>
            </div>

            {error && <div className="text-xs text-panel-danger">{error}</div>}
          </div>
        )}

        <div className="flex items-center justify-between border-t border-panel-border px-4 py-3">
          <div>
            {isEdit && !isGithubCard && (
              <button onClick={() => void remove()} className="text-xs text-panel-danger hover:underline">
                Delete
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn">Cancel</button>
            {!isGithubCard && (
              <button
                onClick={() => void save()}
                disabled={!title.trim() || submitting}
                className="btn-primary disabled:opacity-50"
              >
                {submitting
                  ? 'Saving…'
                  : promotingToGithub
                  ? 'Create issue'
                  : isEdit
                  ? 'Save'
                  : 'Create'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
