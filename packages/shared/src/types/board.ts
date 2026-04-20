export type ColumnId = 'backlog' | 'todo' | 'in_progress' | 'review' | 'done'

export const COLUMNS: readonly ColumnId[] = [
  'backlog',
  'todo',
  'in_progress',
  'review',
  'done',
] as const

export const COLUMN_LABELS: Record<ColumnId, string> = {
  backlog: 'Backlog',
  todo: 'To Do',
  in_progress: 'In Progress',
  review: 'In Review',
  done: 'Done',
}

export type CardType = 'issue' | 'pr'
export type CardState = 'open' | 'closed' | 'merged'

export type BoardCard = {
  id: string
  githubId: number
  title: string
  type: CardType
  state: CardState
  repo: string
  url: string
  labels: string[]
  assignee?: string
  column: ColumnId
  position: number
  updatedAt: string
  updatedBy?: string
}

export type CardPatch = Pick<BoardCard, 'id' | 'column' | 'position'>

export type Board = {
  id: string
  name: string
  workspaceId: string
  cards: BoardCard[]
}
