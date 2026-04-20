import { useEffect, useState } from 'react'
import type { BoardCard, CardPriority } from '@shared/types/board'
import { useBoardStore } from '@/store/boardStore'

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

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [labels, setLabels] = useState('')
  const [priority, setPriority] = useState<CardPriority | ''>('')

  useEffect(() => {
    if (open) {
      setTitle(card?.title ?? '')
      setBody(card?.body ?? '')
      setLabels(card?.labels.join(', ') ?? '')
      setPriority(card?.priority ?? '')
    }
  }, [open, card])

  if (!open) return null

  const isGithub = card?.provider === 'github'
  const isEdit = !!card

  const save = async () => {
    const labelList = labels.split(',').map((s) => s.trim()).filter(Boolean)
    const payload = {
      title,
      body: body || undefined,
      labels: labelList,
      priority: (priority || undefined) as CardPriority | undefined,
    }
    if (isEdit && !isGithub) {
      await updateLocal(card.id, payload)
    } else if (!isEdit) {
      await createLocal({ ...payload, column: 'backlog' })
    }
    onClose()
  }

  const remove = async () => {
    if (!card || isGithub) return
    if (confirm(`Delete "${card.title}"?`)) {
      await deleteLocal(card.id)
      onClose()
    }
  }

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
            {isEdit ? (isGithub ? card.title : 'Edit task') : 'New task'}
          </h2>
          <button onClick={onClose} className="text-panel-muted hover:text-panel-text">×</button>
        </div>

        {isGithub && card ? (
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
                <span className="text-xs text-panel-muted">Priority</span>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as CardPriority | '')}
                  className="mt-1 w-full rounded border border-panel-border bg-panel-bg px-2 py-1.5 text-sm focus:outline-none focus:border-panel-accent"
                >
                  <option value="">—</option>
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-panel-border px-4 py-3">
          <div>
            {isEdit && !isGithub && (
              <button onClick={remove} className="text-xs text-panel-danger hover:underline">
                Delete
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn">Cancel</button>
            {!isGithub && (
              <button onClick={save} disabled={!title.trim()} className="btn-primary disabled:opacity-50">
                {isEdit ? 'Save' : 'Create'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
