<h1 align="center">
  <br>
  GitPanel
  <br>
</h1>

<p align="center">
  GitHub task management that lives next to your code — Kanban board, metrics, multi-repo sync, integrated terminal, and an MCP server for AI agents.
</p>

<p align="center">
  <img src="apps/desktop/public/git_panel_logo.svg" width="200" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Electron-31+-47848F?style=flat-square&logo=electron&logoColor=white" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/TypeScript-strict-3178C6?style=flat-square&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" />
  <img src="https://img.shields.io/badge/Zustand-state-FF6B35?style=flat-square" />
  <img src="https://img.shields.io/badge/xterm.js-terminal-black?style=flat-square" />
  <img src="https://img.shields.io/badge/Fastify-API-000000?style=flat-square&logo=fastify&logoColor=white" />
  <img src="https://img.shields.io/badge/Prisma-PostgreSQL-2D3748?style=flat-square&logo=prisma&logoColor=white" />
  <img src="https://img.shields.io/badge/MCP-server-orange?style=flat-square" />
</p>

---

GitPanel replaces the fragmented workflow between GitHub, Jira, Notion, and separate terminals with a single focused desktop app — for solo developers or small teams.

It supports two modes:

| Mode | Description | Storage |
|---|---|---|
| **Local** | Solo, offline-first | `electron-store` (on device) |
| **Cloud** | Team sync | Self-hostable REST API + PostgreSQL |

---

## Features

### Kanban Board

Drag-and-drop Issues and PRs across five columns: **Backlog → To Do → In Progress → In Review → Done**. Local tasks and GitHub cards live on the same board. GitHub state syncs in the background; column overrides are preserved.

![Kanban board with integrated terminal](docs/images/kanban.png)

> The board combines local tasks and GitHub issues/PRs from all watched repositories. The integrated terminal panel at the bottom lets you run any CLI — including AI agents like Claude Code — without leaving the app.

---

### Metrics

Get a snapshot of your board health at a glance: card counts per column, breakdown by source (GitHub Issues, PRs, local tasks), distribution by priority, and top labels.

![Metrics dashboard](docs/images/metrics.png)

> The metrics tab tracks total cards, active work, in-progress items, and done count. Board distribution, source breakdown, priority matrix, and label frequency are all visible in one screen.

---

### Projects

Watch any GitHub repository or register a local folder as a project. Local projects are task-only (no GitHub sync) — useful for Obsidian vaults, personal notes, or anything outside GitHub.

![Projects management](docs/images/projects.png)

> GitHub repositories can be linked to a local folder path so the terminal opens at the correct `cwd` automatically. Local projects appear as separate entries and support the full task/board workflow.

---

### Saved Commands

Store shell commands with an associated project and working directory. Run any command with a single click — it opens in a new terminal tab scoped to the right folder.

![Commands tab](docs/images/commands.png)

> Commands are saved with a name, shell invocation, and optional project link. One click runs the command in a new terminal tab. Useful for dev server startup scripts, build commands, or launching AI agent CLIs.

---

### Integrated Terminal

A full PTY terminal (powered by `node-pty` + `xterm.js`) embedded in the app. Each tab is an independent shell session. When opened from a repository card, the terminal automatically starts at that repo's local path.

Supported AI agent CLIs that work out of the box:

| Agent | Command |
|---|---|
| Claude Code | `claude` |
| GitHub Copilot CLI | `gh copilot` |
| Aider | `aider` |
| OpenHands | `openhands` |

---

## MCP Server

GitPanel ships with a built-in **Model Context Protocol (MCP) server** that exposes the board, tasks, projects, and commands to any MCP-compatible AI assistant — including Claude Code running inside the integrated terminal.

This means AI agents can read and write your board directly, without you opening the UI.

### Available tools

| Tool | What it does |
|---|---|
| `get_board_summary` | Card counts per column, broken down by provider |
| `list_cards` | Cards with IDs, titles, columns, priorities, and labels |
| `create_task` | Create a local task and place it on the board |
| `update_task` | Rename, reprioritize, or re-label a local task |
| `move_card` | Move any card (local or GitHub) to a different column |
| `delete_task` | Permanently delete a local task |
| `list_projects` | All watched repos and local projects with their paths |
| `create_github_issue` | Open a real GitHub issue and register it on the board |
| `list_commands` | All saved commands from the Commands tab |
| `run_command` | Execute a saved command and return its output |

### Example — Claude Code moving a card

```
> move the "Add dark mode" task to in progress
```

Claude calls `list_cards`, finds the task ID, then calls `move_card` — the board updates in real time with no manual interaction.

### Connecting

Add this to your `claude_desktop_config.json` or Claude Code MCP settings:

```json
{
  "mcpServers": {
    "gitpanel": {
      "command": "node",
      "args": ["path/to/gitpanel/mcp/index.js"]
    }
  }
}
```

Changes made through MCP are reflected in the GitPanel UI within seconds via a file watcher.

---

## Getting Started

### Prerequisites

- **Node.js 20+** and **npm 10+**
- **Windows:** Visual Studio Build Tools (required to compile `node-pty`)
- **macOS:** Xcode Command Line Tools
- **Linux:** `build-essential` and `python3`

### Installation

```bash
git clone <repo-url>
cd git_panel
npm install
```

### Development

```bash
# Desktop only
npm run dev -w @gitpanel/desktop

# Full stack (Cloud mode)
docker-compose -f docker-compose.dev.yml up -d   # PostgreSQL
npm run dev -w @gitpanel/api                     # API on :3333
npm run dev -w @gitpanel/desktop
```

### Build

```bash
npm run build -w @gitpanel/desktop
npm run dist  -w @gitpanel/desktop   # Generates platform installer
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

## Monorepo Structure

```
gitpanel/
├── apps/
│   ├── desktop/         # Electron + React
│   └── api/             # Fastify + Prisma (Cloud mode)
├── packages/
│   └── shared/          # Shared domain types
├── turbo.json
└── package.json
```

---

## Project Status

| Phase | Scope | Status |
|---|---|---|
| **1 — Foundation** | Monorepo, Electron shell, terminal, shared types | ✅ Done |
| **2 — GitHub** | OAuth, repo list, Kanban drag-and-drop, Issues/PRs sync | ✅ Done |
| **3 — Cloud API** | Fastify, Prisma, JWT auth, workspaces, members | ⏳ Planned |
| **4 — Realtime** | SSE board sync, metrics, workspace permissions | ⏳ Planned |

---

## Contributing

See [CLAUDE.md](CLAUDE.md) for full architecture context, coding conventions, and security rules that guide contributions — human or AI.

**Key conventions:**
- TypeScript strict everywhere — no `any`
- Domain types in `packages/shared` — never duplicate across apps
- No direct GitHub API calls from the renderer — always via IPC
- IPC handlers return `{ data, error }`, never throw across the boundary
- PTY sessions live exclusively in the main process

---

## License

MIT — see [LICENSE.md](LICENSE.md).
