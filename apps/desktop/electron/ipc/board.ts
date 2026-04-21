import { ipcMain } from 'electron'
import Store from 'electron-store'
import { watch, type FSWatcher } from 'node:fs'
import { randomUUID } from 'node:crypto'
import type { BrowserWindow } from 'electron'
import type { BoardCard, CardPatch, NewLocalCard } from '@shared/types/board'

type Override = { column: BoardCard['column']; position: number; updatedAt: string }

type BoardSchema = {
  localCards: BoardCard[]
  // key = BoardCard.id (either "gh:owner/repo#n" or "local:uuid")
  overrides: Record<string, Override>
}

const board = new Store<BoardSchema>({
  name: 'board',
  defaults: { localCards: [], overrides: {} },
})

export function applyOverrides(cards: BoardCard[]): BoardCard[] {
  const overrides = board.get('overrides')
  return cards.map((c) => {
    const o = overrides[c.id]
    if (!o) return c
    return { ...c, column: o.column, position: o.position, updatedAt: o.updatedAt }
  })
}

let boardWatcher: FSWatcher | null = null

// Track whether the app itself just wrote the file so we don't reload on our own writes.
let suppressNext = false
export function suppressNextExternalChange(): void {
  suppressNext = true
}

export function registerBoardIpc(getWindow: () => BrowserWindow | null): void {
  // Watch for external writes (e.g. MCP server) and notify the renderer.
  boardWatcher = watch(board.path, () => {
    if (suppressNext) {
      suppressNext = false
      return
    }
    getWindow()?.webContents.send('board:external-change')
  })

  ipcMain.handle('board:listLocal', () => {
    const cards = board.get('localCards')
    return { data: applyOverrides(cards), error: null }
  })

  ipcMain.handle('board:createLocal', (_evt, input: NewLocalCard) => {
    const now = new Date().toISOString()
    const card: BoardCard = {
      id: `local:${randomUUID()}`,
      provider: 'local',
      title: input.title.trim() || 'Untitled',
      body: input.body?.trim() || undefined,
      type: 'task',
      state: 'open',
      labels: input.labels ?? [],
      assignee: input.assignee,
      priority: input.priority,
      repoId: input.repoId,
      column: input.column ?? 'backlog',
      position: Date.now(),
      createdAt: now,
      updatedAt: now,
    }
    const cards = board.get('localCards')
    suppressNextExternalChange()
    board.set('localCards', [...cards, card])
    return { data: card, error: null }
  })

  ipcMain.handle('board:updateLocal', (_evt, id: string, patch: Partial<BoardCard>) => {
    const cards = board.get('localCards')
    const idx = cards.findIndex((c) => c.id === id)
    if (idx === -1) return { data: null, error: { code: 'NOT_FOUND', message: `card ${id}` } }
    const existing = cards[idx]!
    const updated: BoardCard = {
      ...existing,
      ...patch,
      id: existing.id,
      provider: 'local',
      updatedAt: new Date().toISOString(),
    }
    const next = [...cards]
    next[idx] = updated
    suppressNextExternalChange()
    board.set('localCards', next)
    return { data: updated, error: null }
  })

  ipcMain.handle('board:deleteLocal', (_evt, id: string) => {
    const cards = board.get('localCards')
    suppressNextExternalChange()
    board.set('localCards', cards.filter((c) => c.id !== id))
    const overrides = board.get('overrides')
    if (overrides[id]) {
      delete overrides[id]
      suppressNextExternalChange()
      board.set('overrides', overrides)
    }
    return { data: true, error: null }
  })

  ipcMain.handle('board:applyPatches', (_evt, patches: CardPatch[]) => {
    const overrides = { ...board.get('overrides') }
    const now = new Date().toISOString()
    for (const p of patches) {
      overrides[p.id] = { column: p.column, position: p.position, updatedAt: now }
    }
    suppressNextExternalChange()
    board.set('overrides', overrides)

    // Mirror into localCards so the column/position is authoritative for local items too.
    const localCards = board.get('localCards').map((c) => {
      const o = overrides[c.id]
      return o ? { ...c, column: o.column, position: o.position, updatedAt: now } : c
    })
    suppressNextExternalChange()
    board.set('localCards', localCards)

    return { data: true, error: null }
  })

  ipcMain.handle('board:clearOverrides', () => {
    suppressNextExternalChange()
    board.set('overrides', {})
    return { data: true, error: null }
  })
}

export function disposeBoardIpc(): void {
  boardWatcher?.close()
  boardWatcher = null
}
