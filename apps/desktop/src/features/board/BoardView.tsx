import { useEffect, useMemo, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import type { BoardCard, CardPatch, ColumnId } from '@shared/types/board'
import { COLUMNS } from '@shared/types/board'
import { useBoardStore } from '@/store/boardStore'
import { useAuthStore } from '@/store/authStore'
import { BoardColumn } from './BoardColumn'
import { BoardCardView } from './BoardCard'
import { CardDialog } from './CardDialog'

export function BoardView() {
  const cards = useBoardStore((s) => s.cards)
  const loadLocal = useBoardStore((s) => s.loadLocal)
  const sync = useBoardStore((s) => s.sync)
  const syncing = useBoardStore((s) => s.syncing)
  const syncErrors = useBoardStore((s) => s.syncErrors)
  const persistMove = useBoardStore((s) => s.persistMove)
  const moveCard = useBoardStore((s) => s.moveCard)

  const authMode = useAuthStore((s) => s.status?.mode ?? 'none')

  const [activeId, setActiveId] = useState<string | null>(null)
  const [dialogCard, setDialogCard] = useState<BoardCard | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  useEffect(() => { void loadLocal() }, [loadLocal])

  const byColumn = useMemo(() => {
    const map: Record<ColumnId, BoardCard[]> = {
      backlog: [], todo: [], in_progress: [], review: [], done: [],
    }
    for (const c of cards) map[c.column].push(c)
    for (const col of COLUMNS) map[col].sort((a, b) => a.position - b.position)
    return map
  }, [cards])

  const active = activeId ? cards.find((c) => c.id === activeId) : null

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id))
  }

  function resolveTargetColumn(
    overId: string,
    overCard: BoardCard | undefined,
    overData: { column?: ColumnId } | undefined,
    fallback: ColumnId,
  ): ColumnId {
    if (overCard) return overCard.column
    if (overData?.column) return overData.column
    if ((COLUMNS as readonly string[]).includes(overId)) return overId as ColumnId
    return fallback
  }

  function handleDragOver(e: DragOverEvent) {
    const { active, over } = e
    if (!over) return
    const activeCard = cards.find((c) => c.id === active.id)
    if (!activeCard) return

    const overData = over.data.current as { column?: ColumnId } | undefined
    const overId = String(over.id)
    const overCard = cards.find((c) => c.id === overId)
    const targetColumn = resolveTargetColumn(overId, overCard, overData, activeCard.column)

    if (activeCard.column !== targetColumn) {
      const targetList = cards.filter((c) => c.column === targetColumn && c.id !== activeCard.id)
      const newPosition = targetList.length > 0 ? targetList[targetList.length - 1]!.position + 100 : 0
      moveCard(activeCard.id, targetColumn, newPosition)
    }
  }

  async function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e
    setActiveId(null)
    if (!over) return
    const activeCard = cards.find((c) => c.id === active.id)
    if (!activeCard) return

    const overId = String(over.id)
    const overCard = cards.find((c) => c.id === overId)
    const overData = over.data.current as { column?: ColumnId } | undefined
    const targetColumn = resolveTargetColumn(overId, overCard, overData, activeCard.column)

    const list = cards
      .filter((c) => c.column === targetColumn && c.id !== activeCard.id)
      .sort((a, b) => a.position - b.position)

    let insertIndex = list.length
    if (overCard && overCard.column === targetColumn) {
      insertIndex = list.findIndex((c) => c.id === overCard.id)
      if (insertIndex === -1) insertIndex = list.length
    }

    const before = list[insertIndex - 1]?.position ?? 0
    const after = list[insertIndex]?.position ?? before + 200
    const newPosition = (before + after) / 2

    moveCard(activeCard.id, targetColumn, newPosition)

    // Reindex to avoid drift
    const finalList = [
      ...list.slice(0, insertIndex),
      { ...activeCard, column: targetColumn, position: newPosition },
      ...list.slice(insertIndex),
    ]
    const patches: CardPatch[] = finalList.map((c, idx) => ({
      id: c.id,
      column: targetColumn,
      position: (idx + 1) * 1000,
    }))
    for (const p of patches) moveCard(p.id, p.column, p.position)
    await persistMove(patches)
  }

  const openCard = (card: BoardCard) => { setDialogCard(card); setDialogOpen(true) }
  const openNew = () => { setDialogCard(null); setDialogOpen(true) }

  return (
    <div className="h-full flex flex-col">
      <header className="flex items-center justify-between border-b border-panel-border px-5 py-3">
        <div>
          <h1 className="text-lg font-semibold">Board</h1>
          <p className="text-xs text-panel-muted">
            {authMode === 'none'
              ? 'Local tasks — connect GitHub in Settings to add issues and PRs.'
              : 'Local tasks + open issues/PRs from watched repositories.'}
          </p>
        </div>
        <div className="flex gap-2">
          {authMode !== 'none' && (
            <button onClick={() => void sync()} disabled={syncing} className="btn disabled:opacity-50">
              {syncing ? 'Syncing…' : 'Sync GitHub'}
            </button>
          )}
          <button onClick={openNew} className="btn-primary">+ New task</button>
        </div>
      </header>

      {syncErrors.length > 0 && (
        <div className="border-b border-panel-border bg-panel-danger/10 px-5 py-2 text-xs text-panel-danger">
          {syncErrors.length} repo(s) failed to sync: {syncErrors.map((e) => e.repo).join(', ')}
        </div>
      )}

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 grid grid-cols-5 gap-3 p-4 overflow-x-auto min-w-0">
          {COLUMNS.map((col) => (
            <BoardColumn key={col} column={col} cards={byColumn[col]} onCardClick={openCard} />
          ))}
        </div>
        <DragOverlay>
          {active && <BoardCardView card={active} />}
        </DragOverlay>
      </DndContext>

      <CardDialog open={dialogOpen} card={dialogCard} onClose={() => setDialogOpen(false)} />
    </div>
  )
}
