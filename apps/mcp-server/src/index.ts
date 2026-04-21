#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { randomUUID } from 'node:crypto'
import { Octokit } from '@octokit/rest'

// ---------------------------------------------------------------------------
// Data directory resolution
// ---------------------------------------------------------------------------

type DataDirResult = { dir: string; found: boolean; checked: string[] }

function resolveDataDir(): DataDirResult {
  if (process.env['GITPANEL_DATA_DIR']) {
    const dir = process.env['GITPANEL_DATA_DIR']
    return { dir, found: existsSync(path.join(dir, 'board.json')), checked: [dir] }
  }

  // electron-store saves to app.getPath('userData').
  // The app name is derived from package.json "name", so for "@gitpanel/desktop"
  // it becomes "%APPDATA%\@gitpanel\desktop" in dev mode.
  // Packaged builds typically use the productName ("GitPanel").
  let baseDirs: string[]
  if (process.platform === 'win32') {
    const appData = process.env['APPDATA'] ?? path.join(os.homedir(), 'AppData', 'Roaming')
    baseDirs = [
      path.join(appData, '@gitpanel', 'desktop'),  // dev mode — package name @gitpanel/desktop
      path.join(appData, 'GitPanel'),               // packaged productName
      path.join(appData, 'Electron'),               // electron-vite fallback
      path.join(appData, 'gitpanel'),
    ]
  } else if (process.platform === 'darwin') {
    const base = path.join(os.homedir(), 'Library', 'Application Support')
    baseDirs = [
      path.join(base, '@gitpanel', 'desktop'),
      path.join(base, 'GitPanel'),
      path.join(base, 'Electron'),
      path.join(base, 'gitpanel'),
    ]
  } else {
    const base = process.env['XDG_CONFIG_HOME'] ?? path.join(os.homedir(), '.config')
    baseDirs = [
      path.join(base, '@gitpanel', 'desktop'),
      path.join(base, 'GitPanel'),
      path.join(base, 'Electron'),
      path.join(base, 'gitpanel'),
    ]
  }

  for (const dir of baseDirs) {
    if (existsSync(path.join(dir, 'board.json'))) {
      return { dir, found: true, checked: baseDirs }
    }
  }
  // Not found — return first candidate so writes have a predictable location
  return { dir: baseDirs[0]!, found: false, checked: baseDirs }
}

const DATA_DIR_RESULT = resolveDataDir()
const DATA_DIR = DATA_DIR_RESULT.dir

// ---------------------------------------------------------------------------
// Shared types (inline to avoid cross-package deps at runtime)
// ---------------------------------------------------------------------------

type ColumnId = 'backlog' | 'todo' | 'in_progress' | 'review' | 'done'
type CardProvider = 'github' | 'local'
type CardPriority = 'low' | 'medium' | 'high' | 'urgent'

interface BoardCard {
  id: string
  provider: CardProvider
  githubId?: number
  title: string
  body?: string
  type: 'issue' | 'pr' | 'task'
  state: 'open' | 'closed' | 'merged'
  repo?: string
  repoId?: string
  url?: string
  labels: string[]
  assignee?: string
  priority?: CardPriority
  column: ColumnId
  position: number
  createdAt: string
  updatedAt: string
}

interface Override {
  column: ColumnId
  position: number
  updatedAt: string
}

interface BoardStore {
  localCards: BoardCard[]
  overrides: Record<string, Override>
}

interface WatchedRepo {
  id: string
  kind: 'github' | 'local'
  fullName: string
  owner?: string
  name?: string
  localPath?: string
  defaultBranch?: string
  private: boolean
  addedAt: string
}

interface ReposStore {
  watched: WatchedRepo[]
}

const COLUMNS: ColumnId[] = ['backlog', 'todo', 'in_progress', 'review', 'done']

// ---------------------------------------------------------------------------
// Store helpers — plain JSON read/write
// ---------------------------------------------------------------------------

function readBoard(): BoardStore {
  const file = path.join(DATA_DIR, 'board.json')
  if (!existsSync(file)) return { localCards: [], overrides: {} }
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as BoardStore
  } catch {
    return { localCards: [], overrides: {} }
  }
}

function writeBoard(data: BoardStore): void {
  writeFileSync(path.join(DATA_DIR, 'board.json'), JSON.stringify(data, null, 2), 'utf8')
}

function readRepos(): WatchedRepo[] {
  const file = path.join(DATA_DIR, 'repos.json')
  if (!existsSync(file)) return []
  try {
    const raw = JSON.parse(readFileSync(file, 'utf8')) as ReposStore
    return (raw.watched ?? []).map((r) => ({ ...r, kind: r.kind ?? 'github' }))
  } catch {
    return []
  }
}

function applyOverrides(cards: BoardCard[], overrides: Record<string, Override>): BoardCard[] {
  return cards.map((c) => {
    const o = overrides[c.id]
    return o ? { ...c, column: o.column, position: o.position, updatedAt: o.updatedAt } : c
  })
}

// ---------------------------------------------------------------------------
// MCP server
// ---------------------------------------------------------------------------

const server = new Server(
  { name: 'gitpanel', version: '0.1.0' },
  { capabilities: { tools: {} } },
)

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'get_board_summary',
      description: 'Returns a summary of the GitPanel board: card counts per column, broken down by provider (github / local). Use this to understand the current state of the board at a glance.',
      inputSchema: { type: 'object', properties: {}, required: [] },
    },
    {
      name: 'list_cards',
      description: 'Lists board cards. By default returns all open cards. Filter by column or provider as needed.',
      inputSchema: {
        type: 'object',
        properties: {
          column: { type: 'string', enum: COLUMNS, description: 'Filter by column' },
          provider: { type: 'string', enum: ['github', 'local'], description: 'Filter by provider' },
          include_done: { type: 'boolean', description: 'Include cards in the Done column (default false)' },
        },
        required: [],
      },
    },
    {
      name: 'create_task',
      description: 'Creates a new local task card on the GitPanel board.',
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Card title (required)' },
          body: { type: 'string', description: 'Optional description / notes' },
          column: { type: 'string', enum: COLUMNS, description: 'Initial column (default: backlog)' },
          priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
          labels: { type: 'array', items: { type: 'string' }, description: 'List of label strings' },
          project_id: { type: 'string', description: 'ID of a watched project/repo to attach this card to' },
        },
        required: ['title'],
      },
    },
    {
      name: 'update_task',
      description: 'Updates fields on a local task card. Only local (non-GitHub) cards can be edited.',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Card ID (starts with "local:")' },
          title: { type: 'string' },
          body: { type: 'string' },
          priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent', ''] },
          labels: { type: 'array', items: { type: 'string' } },
        },
        required: ['id'],
      },
    },
    {
      name: 'move_card',
      description: 'Moves a card to a different column on the board.',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Card ID' },
          column: { type: 'string', enum: COLUMNS, description: 'Target column' },
        },
        required: ['id', 'column'],
      },
    },
    {
      name: 'delete_task',
      description: 'Permanently deletes a local task card. Cannot delete GitHub cards.',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Card ID (must start with "local:")' },
        },
        required: ['id'],
      },
    },
    {
      name: 'list_projects',
      description: 'Lists all watched repositories and local projects configured in GitPanel.',
      inputSchema: {
        type: 'object',
        properties: {
          kind: { type: 'string', enum: ['github', 'local'], description: 'Filter by kind' },
        },
        required: [],
      },
    },
    {
      name: 'create_github_issue',
      description: 'Creates a real GitHub issue on a watched repository and adds it to the board. Requires GITHUB_TOKEN env var.',
      inputSchema: {
        type: 'object',
        properties: {
          repo: { type: 'string', description: 'Full repo name e.g. "owner/repo"' },
          title: { type: 'string', description: 'Issue title' },
          body: { type: 'string', description: 'Issue body (markdown)' },
          labels: { type: 'array', items: { type: 'string' } },
        },
        required: ['repo', 'title'],
      },
    },
  ],
}))

// ---------------------------------------------------------------------------
// Tool handlers
// ---------------------------------------------------------------------------

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params
  const a = (args ?? {}) as Record<string, unknown>

  try {
    switch (name) {

      case 'get_board_summary': {
        if (!DATA_DIR_RESULT.found) {
          return {
            content: [{
              type: 'text',
              text: [
                '⚠️  GitPanel data not found. The board.json file was not detected in any of the expected locations:',
                ...DATA_DIR_RESULT.checked.map((p) => `  • ${p}`),
                '',
                'To fix this, open GitPanel at least once so it creates its data files, then run:',
                `  claude mcp add gitpanel -e GITPANEL_DATA_DIR="<path>" node "${process.argv[1]}"`,
                '',
                'In dev mode the path is usually:  %APPDATA%\\Electron',
                'In production it is:              %APPDATA%\\GitPanel',
              ].join('\n'),
            }],
          }
        }

        const { localCards, overrides } = readBoard()
        const repos = readRepos()
        const all = applyOverrides(localCards, overrides)

        // Also load any github cards from overrides that reference gh: ids
        const overrideIds = Object.keys(overrides).filter((id) => id.startsWith('gh:'))
        const summary: Record<ColumnId, { total: number; github: number; local: number }> = {
          backlog: { total: 0, github: 0, local: 0 },
          todo: { total: 0, github: 0, local: 0 },
          in_progress: { total: 0, github: 0, local: 0 },
          review: { total: 0, github: 0, local: 0 },
          done: { total: 0, github: 0, local: 0 },
        }
        for (const c of all) {
          const col = summary[c.column]
          if (col) {
            col.total++
            if (c.provider === 'github') col.github++
            else col.local++
          }
        }

        const lines = [
          `GitPanel board summary — data dir: ${DATA_DIR}`,
          `Local tasks: ${localCards.length} | GitHub column overrides: ${overrideIds.length}`,
          `Watched projects: ${repos.length} (${repos.filter((r) => r.kind === 'github').length} GitHub, ${repos.filter((r) => r.kind === 'local').length} local)`,
          '',
          'Columns:',
          ...COLUMNS.map((col) => {
            const s = summary[col]!
            return `  ${col.padEnd(12)} — ${s.total} cards (${s.github} github, ${s.local} local)`
          }),
        ]
        return { content: [{ type: 'text', text: lines.join('\n') }] }
      }

      case 'list_cards': {
        const { localCards, overrides } = readBoard()
        let cards = applyOverrides(localCards, overrides)

        if (a['column']) cards = cards.filter((c) => c.column === a['column'])
        if (a['provider']) cards = cards.filter((c) => c.provider === a['provider'])
        if (!a['include_done']) cards = cards.filter((c) => c.column !== 'done')

        if (cards.length === 0) {
          return { content: [{ type: 'text', text: 'No cards match the filter.' }] }
        }

        const repos = readRepos()
        const repoMap = new Map(repos.map((r) => [r.id, r.fullName]))

        const lines = cards
          .sort((a, b) => a.position - b.position)
          .map((c) => {
            const project = c.repoId ? repoMap.get(c.repoId) ?? c.repo : c.repo
            const meta = [
              c.column,
              c.provider,
              c.type,
              c.priority ? `priority:${c.priority}` : null,
              project ? `project:${project}` : null,
              c.labels.length ? `labels:[${c.labels.join(',')}]` : null,
              c.url ? c.url : null,
            ].filter(Boolean).join(' | ')
            return `[${c.id}]\n  ${c.title}\n  ${meta}`
          })
        return { content: [{ type: 'text', text: lines.join('\n\n') }] }
      }

      case 'create_task': {
        const title = (a['title'] as string | undefined)?.trim()
        if (!title) throw new Error('title is required')

        const store = readBoard()
        const now = new Date().toISOString()
        const card: BoardCard = {
          id: `local:${randomUUID()}`,
          provider: 'local',
          title,
          body: (a['body'] as string | undefined) || undefined,
          type: 'task',
          state: 'open',
          labels: (a['labels'] as string[] | undefined) ?? [],
          priority: (a['priority'] as CardPriority | undefined) || undefined,
          repoId: (a['project_id'] as string | undefined) || undefined,
          column: (a['column'] as ColumnId | undefined) ?? 'backlog',
          position: Date.now(),
          createdAt: now,
          updatedAt: now,
        }
        store.localCards.push(card)
        writeBoard(store)
        return { content: [{ type: 'text', text: `Task created: ${card.id}\n  "${card.title}" → column: ${card.column}` }] }
      }

      case 'update_task': {
        const id = a['id'] as string | undefined
        if (!id) throw new Error('id is required')
        if (!id.startsWith('local:')) throw new Error('Only local tasks can be updated via MCP')

        const store = readBoard()
        const idx = store.localCards.findIndex((c) => c.id === id)
        if (idx === -1) throw new Error(`Card not found: ${id}`)

        const existing = store.localCards[idx]!
        const updated: BoardCard = {
          ...existing,
          title: (a['title'] as string | undefined)?.trim() ?? existing.title,
          body: (a['body'] as string | undefined) ?? existing.body,
          priority: ((a['priority'] as string | undefined) || undefined) as CardPriority | undefined ?? existing.priority,
          labels: (a['labels'] as string[] | undefined) ?? existing.labels,
          updatedAt: new Date().toISOString(),
        }
        store.localCards[idx] = updated
        writeBoard(store)
        return { content: [{ type: 'text', text: `Task updated: ${id}\n  "${updated.title}"` }] }
      }

      case 'move_card': {
        const id = a['id'] as string | undefined
        const column = a['column'] as ColumnId | undefined
        if (!id) throw new Error('id is required')
        if (!column || !COLUMNS.includes(column)) throw new Error(`Invalid column: ${String(column)}`)

        const store = readBoard()
        const now = new Date().toISOString()
        const position = Date.now()

        // Update overrides for both github and local cards
        store.overrides[id] = { column, position, updatedAt: now }

        // If it's a local card, also update inline
        const idx = store.localCards.findIndex((c) => c.id === id)
        if (idx !== -1) {
          store.localCards[idx] = { ...store.localCards[idx]!, column, position, updatedAt: now }
        }

        writeBoard(store)
        return { content: [{ type: 'text', text: `Card ${id} moved to column: ${column}` }] }
      }

      case 'delete_task': {
        const id = a['id'] as string | undefined
        if (!id) throw new Error('id is required')
        if (!id.startsWith('local:')) throw new Error('Only local tasks can be deleted via MCP')

        const store = readBoard()
        const before = store.localCards.length
        store.localCards = store.localCards.filter((c) => c.id !== id)
        if (store.localCards.length === before) throw new Error(`Card not found: ${id}`)
        delete store.overrides[id]
        writeBoard(store)
        return { content: [{ type: 'text', text: `Task deleted: ${id}` }] }
      }

      case 'list_projects': {
        const repos = readRepos()
        const filtered = a['kind'] ? repos.filter((r) => r.kind === a['kind']) : repos

        if (filtered.length === 0) {
          return { content: [{ type: 'text', text: 'No projects configured.' }] }
        }

        const lines = filtered.map((r) => {
          const parts = [
            `[${r.id}]`,
            r.kind.toUpperCase(),
            r.fullName,
            r.private ? '(private)' : '',
            r.localPath ? `→ ${r.localPath}` : '',
          ].filter(Boolean)
          return parts.join(' ')
        })
        return { content: [{ type: 'text', text: lines.join('\n') }] }
      }

      case 'create_github_issue': {
        const token = process.env['GITHUB_TOKEN']
        if (!token) throw new Error('GITHUB_TOKEN env var is required for GitHub operations')

        const repoFull = a['repo'] as string | undefined
        const title = (a['title'] as string | undefined)?.trim()
        if (!repoFull || !title) throw new Error('repo and title are required')

        const [owner, repo] = repoFull.split('/')
        if (!owner || !repo) throw new Error(`Invalid repo format: ${repoFull}`)

        const octokit = new Octokit({ auth: token })
        const { data: issue } = await octokit.issues.create({
          owner,
          repo,
          title,
          body: (a['body'] as string | undefined) || undefined,
          labels: (a['labels'] as string[] | undefined) || [],
        })

        // Add to board as a github card via overrides (no column override = will appear after sync)
        const repos = readRepos()
        const watchedRepo = repos.find((r) => r.kind === 'github' && r.fullName.toLowerCase() === repoFull.toLowerCase())
        const cardId = `gh:${repoFull}#${issue.number}`

        const store = readBoard()
        // Store a backlog override so it appears immediately even before sync
        store.overrides[cardId] = { column: 'backlog', position: Date.now(), updatedAt: new Date().toISOString() }
        writeBoard(store)

        return {
          content: [{
            type: 'text',
            text: [
              `GitHub issue created: #${issue.number}`,
              `  Title: ${issue.title}`,
              `  URL: ${issue.html_url}`,
              `  Board card ID: ${cardId}`,
              watchedRepo ? `  Project: ${watchedRepo.fullName} (sync GitPanel to load it)` : `  Note: ${repoFull} is not yet watched in GitPanel — add it in the Projects view`,
            ].join('\n'),
          }],
        }
      }

      default:
        throw new Error(`Unknown tool: ${name}`)
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { content: [{ type: 'text', text: `Error: ${msg}` }], isError: true }
  }
})

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

const transport = new StdioServerTransport()
await server.connect(transport)
