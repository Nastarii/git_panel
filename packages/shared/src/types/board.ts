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

export type CardType = 'issue' | 'pr' | 'task'
export type CardState = 'open' | 'closed' | 'merged'
export type CardProvider = 'github' | 'local'
export type CardPriority = 'low' | 'medium' | 'high' | 'urgent'

export type BoardCard = {
  id: string
  provider: CardProvider
  githubId?: number
  title: string
  body?: string
  type: CardType
  state: CardState
  repo?: string            // display — "owner/repo" for github, project name for local
  repoId?: string          // stable reference to a WatchedRepo (github or local kind)
  url?: string
  labels: string[]
  assignee?: string
  priority?: CardPriority
  column: ColumnId
  position: number
  createdAt: string
  updatedAt: string
  updatedBy?: string
}

export type CardPatch = Pick<BoardCard, 'id' | 'column' | 'position'>
export type NewLocalCard = Pick<BoardCard, 'title'> &
  Partial<Pick<BoardCard, 'body' | 'labels' | 'priority' | 'column' | 'assignee' | 'repoId'>>

export type Board = {
  id: string
  name: string
  workspaceId: string
  cards: BoardCard[]
}
