import clsx from 'clsx'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { BoardCard as Card } from '@shared/types/board'
import { useReposStore } from '@/store/reposStore'

type Props = {
  card: Card
  onClick?: () => void
}

const priorityDot: Record<string, string> = {
  urgent: 'bg-panel-danger',
  high: 'bg-panel-warning',
  medium: 'bg-panel-accent',
  low: 'bg-panel-muted',
}

export function BoardCardView({ card, onClick }: Props) {
  const repo = useReposStore((s) => (card.repoId ? s.repos.find((r) => r.id === card.repoId) : undefined))
  const displayRepo = card.repo ?? repo?.fullName

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { column: card.column, card },
  })

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={clsx(
        'group rounded-md border border-panel-border bg-panel-surface p-2.5 text-xs cursor-grab active:cursor-grabbing hover:border-panel-accent/60 select-none',
      )}
    >
      <div className="flex items-start gap-2">
        {card.priority && (
          <span
            className={clsx('mt-1 h-2 w-2 shrink-0 rounded-full', priorityDot[card.priority])}
            title={`priority: ${card.priority}`}
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="text-panel-text font-medium leading-snug">{card.title}</div>
          {displayRepo && (
            <div className="mt-1 font-mono text-[10px] text-panel-muted truncate">
              {displayRepo}
              {card.githubId ? ` #${card.id.split('#').pop()}` : ''}
              {repo?.kind === 'local' && ' · local'}
            </div>
          )}
          {card.labels.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {card.labels.slice(0, 4).map((l) => (
                <span
                  key={l}
                  className="rounded bg-panel-bg px-1.5 py-0.5 text-[10px] text-panel-muted border border-panel-border"
                >
                  {l}
                </span>
              ))}
            </div>
          )}
        </div>
        <span
          className={clsx(
            'text-[10px] font-mono uppercase rounded px-1 py-0.5',
            card.provider === 'github'
              ? 'bg-panel-accent/10 text-panel-accent'
              : 'bg-panel-muted/10 text-panel-muted',
          )}
        >
          {card.provider === 'github' ? card.type : 'task'}
        </span>
      </div>
    </div>
  )
}
