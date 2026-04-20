import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { BoardCard, ColumnId } from '@shared/types/board'
import { COLUMN_LABELS } from '@shared/types/board'
import { BoardCardView } from './BoardCard'
import clsx from 'clsx'

type Props = {
  column: ColumnId
  cards: BoardCard[]
  onCardClick: (card: BoardCard) => void
}

export function BoardColumn({ column, cards, onCardClick }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: column, data: { column } })

  return (
    <div className="flex flex-col rounded-lg border border-panel-border bg-panel-surface/30 min-h-0">
      <div className="flex items-center justify-between px-3 py-2 border-b border-panel-border">
        <span className="text-xs font-semibold uppercase tracking-wide text-panel-muted">
          {COLUMN_LABELS[column]}
        </span>
        <span className="text-xs text-panel-muted">{cards.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={clsx(
          'flex-1 p-2 space-y-2 overflow-y-auto transition-colors',
          isOver && 'bg-panel-accent/5',
        )}
      >
        <SortableContext
          id={column}
          items={cards.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {cards.map((card) => (
            <BoardCardView key={card.id} card={card} onClick={() => onCardClick(card)} />
          ))}
        </SortableContext>
        {cards.length === 0 && (
          <div className="text-center text-[10px] text-panel-muted italic pt-6">drop here</div>
        )}
      </div>
    </div>
  )
}
