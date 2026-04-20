# CLAUDE.md — GitPanel

> Personal + team GitHub task management desktop app built with Electron.
> This file gives AI assistants full context to contribute effectively.

---

## Project Overview

**GitPanel** is an Electron desktop app that centralizes GitHub Issues and Pull Requests into a personal productivity system — Kanban view, metrics, multi-repo sync, and an integrated terminal in one place.

It supports two modes:
- **Local mode** — solo use, data stored on-device via `electron-store`
- **Cloud mode** — team use, data synced through a self-hostable REST API backed by PostgreSQL

**Core value:** Replace fragmented tools (GitHub, Jira, Notion, separate terminals) with a single focused panel — for individuals or small teams.

---

## Tech Stack

### Desktop (Electron App)

| Layer | Technology |
|---|---|
| Desktop shell | Electron 30+ |
| Frontend | React 18 + TypeScript |
| Styling | Tailwind CSS |
| State management | Zustand |
| GitHub API | Octokit REST + GraphQL |
| Auth | GitHub OAuth via electron-oauth-handler |
| Local storage | electron-store |
| Terminal emulator | xterm.js + xterm-addon-fit + xterm-addon-web-links |
| Shell bridge | node-pty (main process) |
| Build | electron-builder |
| Bundler | Vite + electron-vite |

### Backend (Cloud / Team mode)

| Layer | Technology |
|---|---|
| Runtime | Node.js 20+ |
| Framework | Fastify |
| Language | TypeScript |
| ORM | Prisma |
| Database | PostgreSQL 15+ |
| Auth | JWT (access + refresh tokens) |
| Realtime | Server-Sent Events (SSE) for board sync |
| Containerization | Docker + Docker Compose |

---

## Monorepo Structure

```
gitpanel/
├── apps/
│   ├── desktop/
│   │   ├── electron/
│   │   │   ├── main.ts
│   │   │   ├── preload.ts
│   │   │   └── ipc/
│   │   │       ├── github.ts
│   │   │       ├── auth.ts
│   │   │       ├── store.ts
│   │   │       ├── cloud.ts
│   │   │       └── terminal.ts       # node-pty spawn + IPC bridge
│   │   ├── src/
│   │   │   ├── app/
│   │   │   ├── features/
│   │   │   │   ├── board/
│   │   │   │   ├── repos/
│   │   │   │   ├── metrics/
│   │   │   │   ├── team/
│   │   │   │   ├── terminal/         # Terminal UI feature
│   │   │   │   │   ├── Terminal.tsx       # xterm.js wrapper
│   │   │   │   │   ├── TerminalTabs.tsx   # Multi-tab management
│   │   │   │   │   ├── TerminalToolbar.tsx
│   │   │   │   │   └── useTerminal.ts     # Hook: IPC <-> xterm
│   │   │   │   └── settings/
│   │   │   ├── store/
│   │   │   │   └── terminalStore.ts  # Tab state, cwd per tab
│   │   │   ├── hooks/
│   │   │   ├── lib/
│   │   │   └── types/
│   │   │       └── terminal.ts
│   │   └── package.json
│   │
│   └── api/
│       ├── src/
│       │   ├── server.ts
│       │   ├── plugins/
│       │   ├── routes/
│       │   ├── services/
│       │   └── lib/
│       ├── prisma/
│       │   ├── schema.prisma
│       │   └── migrations/
│       ├── Dockerfile
│       └── package.json
│
├── packages/
│   └── shared/
│       └── src/
│           ├── types/
│           │   ├── board.ts
│           │   ├── github.ts
│           │   ├── terminal.ts
│           │   └── api.ts
│           └── index.ts
│
├── docker-compose.yml
├── docker-compose.dev.yml
├── turbo.json
└── package.json
```

---

## Architecture

### Local Mode

```
Renderer (React) --IPC--> Main (Electron) --> GitHub API
                 <--IPC--               <-- electron-store
                    |
              Terminal IPC
                    |
            node-pty (main) --> shell process (bash/zsh/pwsh)
```

### Cloud / Team Mode

```
Renderer (React) --IPC--> Main (Electron) --> GitHub API
                 <--IPC--        |
                                 | HTTP / SSE
                                 v
                           Fastify API --> PostgreSQL
```

---

## Terminal Feature

### Overview

The integrated terminal allows developers to run any shell command — including AI agent CLIs like Claude Code, GitHub Copilot CLI, or custom scripts — without leaving GitPanel. Each terminal tab is aware of the active repository context and opens at the correct `cwd` automatically.

### Stack

- **`node-pty`** — spawns a real PTY (pseudo-terminal) in the main process. Supports bash, zsh, PowerShell, and fish.
- **`xterm.js`** — renders the terminal in the renderer via a `<canvas>` element. Full ANSI/VT100 support, colors, Unicode.
- **`xterm-addon-fit`** — resizes the terminal to fill its container on window resize.
- **`xterm-addon-web-links`** — makes URLs in output clickable.

### IPC Protocol

All PTY I/O is bridged through Electron IPC. The renderer never has direct access to `node-pty`.

```typescript
// electron/ipc/terminal.ts — Main process handlers

ipcMain.handle('terminal:create', (_, { cwd, shell }) => {
  const pty = spawn(shell ?? defaultShell(), [], {
    name: 'xterm-color',
    cols: 80,
    rows: 24,
    cwd,
    env: process.env,
  })
  const id = uuid()
  ptySessions.set(id, pty)

  pty.onData((data) => {
    mainWindow.webContents.send(`terminal:data:${id}`, data)
  })

  pty.onExit(() => {
    mainWindow.webContents.send(`terminal:exit:${id}`)
    ptySessions.delete(id)
  })

  return id
})

ipcMain.on('terminal:input', (_, { id, data }) => {
  ptySessions.get(id)?.write(data)
})

ipcMain.on('terminal:resize', (_, { id, cols, rows }) => {
  ptySessions.get(id)?.resize(cols, rows)
})

ipcMain.handle('terminal:kill', (_, id) => {
  ptySessions.get(id)?.kill()
  ptySessions.delete(id)
})
```

```typescript
// electron/preload.ts additions
terminal: {
  create:  (opts: { cwd?: string; shell?: string }) => ipcRenderer.invoke('terminal:create', opts),
  input:   (id: string, data: string)               => ipcRenderer.send('terminal:input', { id, data }),
  resize:  (id: string, cols: number, rows: number) => ipcRenderer.send('terminal:resize', { id, cols, rows }),
  kill:    (id: string)                             => ipcRenderer.invoke('terminal:kill', id),
  onData:  (id: string, cb: (data: string) => void) => ipcRenderer.on(`terminal:data:${id}`, (_, d) => cb(d)),
  onExit:  (id: string, cb: () => void)             => ipcRenderer.once(`terminal:exit:${id}`, cb),
}
```

### Frontend Hook

```typescript
// src/features/terminal/useTerminal.ts
export function useTerminal(containerRef: RefObject<HTMLDivElement>, cwd?: string) {
  const [termId, setTermId] = useState<string | null>(null)

  useEffect(() => {
    const xterm = new Terminal({ theme: gitpanelTheme, fontFamily: 'JetBrains Mono, monospace' })
    const fitAddon = new FitAddon()
    xterm.loadAddon(fitAddon)
    xterm.open(containerRef.current!)
    fitAddon.fit()

    window.api.terminal.create({ cwd }).then((id) => {
      setTermId(id)
      window.api.terminal.onData(id, (data) => xterm.write(data))
      window.api.terminal.onExit(id, () => xterm.writeln('\r\n[Process exited]'))
      xterm.onData((data) => window.api.terminal.input(id, data))
    })

    const ro = new ResizeObserver(() => {
      fitAddon.fit()
      if (termId) window.api.terminal.resize(termId, xterm.cols, xterm.rows)
    })
    ro.observe(containerRef.current!)

    return () => { ro.disconnect(); if (termId) window.api.terminal.kill(termId) }
  }, [])
}
```

### Terminal Tabs

Each tab is an independent PTY session. State is managed in `terminalStore.ts`:

```typescript
type TerminalTab = {
  id: string         // PTY session ID
  label: string      // e.g. repo name or custom
  cwd: string        // working directory
  shell: string      // resolved shell path
}

type TerminalStore = {
  tabs: TerminalTab[]
  activeTabId: string | null
  openTab: (cwd: string, label?: string) => Promise<void>
  closeTab: (id: string) => void
  setActive: (id: string) => void
}
```

### Context-Aware Terminal

When the user opens a terminal from a repository card or the board, GitPanel automatically sets the `cwd` to the local clone path of that repo (if configured in settings). This lets AI agents like **Claude Code** start with the right context immediately.

```typescript
// Opening a terminal from a repo card
const openRepoTerminal = (repo: WatchedRepo) => {
  const cwd = repo.localPath ?? os.homedir()
  terminalStore.openTab(cwd, repo.fullName.split('/')[1])
}
```

### AI Agent Integration

The terminal runs a full PTY — any CLI tool works out of the box. Recommended integrations:

| Agent | Command to launch |
|---|---|
| Claude Code | `claude` |
| GitHub Copilot CLI | `gh copilot` |
| Aider | `aider` |
| OpenDevin / OpenHands | `openhands` |
| Custom scripts | any shell command |

No special integration is needed. Because the terminal opens at the repo's `cwd`, agents like Claude Code automatically detect `CLAUDE.md`, `.git`, and project files.

### Security Considerations

- The PTY runs with the **same OS permissions as the user** — no sandboxing beyond the OS
- Shell path is resolved from system `SHELL` env var or user settings; never accept shell path from renderer input
- `cwd` passed from renderer is validated in main process (must be an existing directory)
- Terminal IPC channels are not exposed to any web content — `contextIsolation: true` ensures this

---

## Database Schema (Prisma)

```prisma
model User {
  id           String    @id @default(cuid())
  githubId     Int       @unique
  login        String
  email        String?
  avatarUrl    String?
  accessToken  String    // encrypted at rest
  refreshToken String?
  createdAt    DateTime  @default(now())
  memberships  Member[]
}

model Workspace {
  id        String          @id @default(cuid())
  name      String
  slug      String          @unique
  ownerId   String
  createdAt DateTime        @default(now())
  members   Member[]
  boards    Board[]
  repos     WorkspaceRepo[]
}

model Member {
  id          String    @id @default(cuid())
  userId      String
  workspaceId String
  role        Role      @default(MEMBER)
  user        User      @relation(fields: [userId], references: [id])
  workspace   Workspace @relation(fields: [workspaceId], references: [id])

  @@unique([userId, workspaceId])
}

enum Role { OWNER ADMIN MEMBER VIEWER }

model WorkspaceRepo {
  id          String    @id @default(cuid())
  workspaceId String
  fullName    String
  workspace   Workspace @relation(fields: [workspaceId], references: [id])

  @@unique([workspaceId, fullName])
}

model Board {
  id          String      @id @default(cuid())
  workspaceId String
  name        String
  workspace   Workspace   @relation(fields: [workspaceId], references: [id])
  cards       BoardCard[]
}

model BoardCard {
  id        String   @id @default(cuid())
  boardId   String
  githubId  Int
  type      CardType
  repo      String
  column    ColumnId
  position  Float
  updatedAt DateTime @updatedAt
  updatedBy String?
  board     Board    @relation(fields: [boardId], references: [id])

  @@unique([boardId, githubId, type])
}

enum CardType { ISSUE PR }
enum ColumnId { BACKLOG TODO IN_PROGRESS REVIEW DONE }
```

---

## API Routes

```
POST   /auth/github                        Exchange GitHub OAuth code -> JWT
POST   /auth/refresh                       Refresh access token

GET    /workspaces                         List user's workspaces
POST   /workspaces                         Create workspace
GET    /workspaces/:slug                   Workspace details

GET    /workspaces/:slug/members           List members
POST   /workspaces/:slug/members           Invite by GitHub login
PATCH  /workspaces/:slug/members/:id       Update role
DELETE /workspaces/:slug/members/:id       Remove member

GET    /workspaces/:slug/repos             List monitored repos
POST   /workspaces/:slug/repos             Add repo
DELETE /workspaces/:slug/repos/:id         Remove repo

GET    /workspaces/:slug/boards            List boards
POST   /workspaces/:slug/boards            Create board
GET    /workspaces/:slug/boards/:id        Full board state
PATCH  /workspaces/:slug/boards/:id/cards  Bulk update card positions

GET    /workspaces/:slug/metrics           Team metrics

GET    /workspaces/:slug/stream            SSE real-time board updates
```

---

## Sync Strategy

### GitHub → DB
- Cron (every 5 min) fetches open Issues + PRs for all workspace repos
- New cards inserted as `BACKLOG`; existing column overrides preserved
- Closed/merged items move to `DONE` unless manually placed elsewhere

### DB → Desktop
- On app open: `GET /boards/:id` hydrates full state
- SSE delivers patch events: `{ cardId, column, position, updatedBy }`
- Optimistic updates with rollback on error

### Conflict Resolution
Last-write-wins on `updatedAt`. SSE broadcasts corrections to other clients.

---

## Shared Domain Types

```typescript
// packages/shared/src/types/board.ts
export type ColumnId = 'backlog' | 'todo' | 'in_progress' | 'review' | 'done'

export type BoardCard = {
  id: string
  githubId: number
  title: string
  type: 'issue' | 'pr'
  state: 'open' | 'closed' | 'merged'
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
```

---

## Development Setup

### Desktop only

```bash
cd apps/desktop
npm install
npm run dev
```

### Full stack

```bash
docker-compose -f docker-compose.dev.yml up -d

cd apps/api && npm install && npx prisma migrate dev && npm run dev
cd apps/desktop && npm run dev
```

### Environment Variables

**`apps/desktop/.env.development`**
```
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITPANEL_API_URL=http://localhost:3333
```

**`apps/api/.env`**
```
DATABASE_URL=postgresql://gitpanel:secret@localhost:5432/gitpanel
JWT_SECRET=
JWT_REFRESH_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
PORT=3333
```

---

## Coding Conventions

- **TypeScript strict mode** everywhere — no `any`
- **Shared types** in `packages/shared` — never duplicate across apps
- **Feature-based folders** — colocate components, hooks, and types
- **No direct GitHub calls from renderer** — always through IPC
- **IPC handlers** return `{ data, error }`, never throw across boundary
- **PTY sessions** managed exclusively in main process — never expose node-pty to renderer
- **API routes** validate bodies with Fastify JSON Schema
- **Async** — `async/await` only

---

## Security Rules

- `contextIsolation: true` and `nodeIntegration: false` — always
- PTY shell path resolved from OS env, never from renderer input
- PTY `cwd` validated as existing directory in main process before spawn
- GitHub tokens encrypted with `safeStorage` on desktop
- JWT access tokens expire in 15 min; refresh tokens in 30 days
- User tokens AES-256 encrypted in PostgreSQL
- All API routes enforce workspace membership check

---

## Useful References

- [electron-vite](https://electron-vite.org)
- [xterm.js](https://xtermjs.org)
- [node-pty](https://github.com/microsoft/node-pty)
- [Fastify](https://fastify.dev)
- [Prisma](https://www.prisma.io/docs)
- [Octokit REST](https://octokit.github.io/rest.js)
- [dnd-kit](https://dndkit.com)
- [Turborepo](https://turbo.build/repo)
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code)
