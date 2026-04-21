# GitPanel MCP — Guia de uso

GitPanel exposes a local MCP server that gives Claude direct access to the board, tasks, and projects. **Use these tools whenever the conversation involves tasks, cards, projects, or board state** — don't ask the user to open the app manually.

## When to use the MCP tools

| Situation | Tool to call |
|---|---|
| User asks what's on the board / what's pending | `get_board_summary` then `list_cards` |
| User asks about their projects or repos | `list_projects` |
| User asks to create a task or to-do | `create_task` |
| User asks to update, rename, or reprioritize a task | `update_task` |
| User asks to move a card, mark as done, start working | `move_card` |
| User asks to delete or remove a task | `delete_task` |
| User asks to open a GitHub issue from a task | `create_github_issue` |

## Available tools

### `get_board_summary`
Returns card counts per column (backlog, todo, in_progress, review, done) broken down by provider (github / local). Use as a first call to understand the current state before listing or filtering.

```
No parameters.
```

### `list_cards`
Returns cards with their IDs, titles, columns, priorities, labels, and project links.

```
column?       — filter by column: backlog | todo | in_progress | review | done
provider?     — filter by: github | local
include_done? — boolean, default false
```

Card IDs follow the pattern:
- `local:uuid` — tasks created inside GitPanel or via MCP
- `gh:owner/repo#number` — GitHub issues/PRs synced from GitHub

### `create_task`
Creates a new local task and places it on the board immediately.

```
title        — required
body?        — description (markdown)
column?      — default: backlog
priority?    — low | medium | high | urgent
labels?      — string array
project_id?  — ID from list_projects to attach the task to a repo
```

### `update_task`
Updates an existing local task. GitHub cards are read-only.

```
id        — required, must start with "local:"
title?    — new title
body?     — new description
priority? — low | medium | high | urgent | "" (to clear)
labels?   — replaces label list
```

### `move_card`
Moves any card (local or GitHub) to a different column. The GitPanel UI updates in real time.

```
id     — required, card ID
column — required: backlog | todo | in_progress | review | done
```

Common moves:
- Start working on a task → column: `in_progress`
- Send to review → column: `review`
- Mark as finished → column: `done`

### `delete_task`
Permanently deletes a local task. Cannot delete GitHub cards.

```
id — required, must start with "local:"
```

### `list_projects`
Lists all watched repositories and local projects with their paths and GitHub URLs.

```
kind? — github | local  (omit for all)
```

### `create_github_issue`
Creates a real GitHub issue on a watched repository and registers it on the board. Requires `GITHUB_TOKEN` in the MCP server env.

```
repo    — required, "owner/repo" format
title   — required
body?   — issue body (markdown)
labels? — string array
```

## Accessing local project files (e.g. Obsidian vault)

`list_projects` returns a `localPath` for each local project registered in GitPanel. Use this path with the `Read`, `Glob`, and `Grep` tools to access files directly — no extra MCP tool needed.

**Pattern — read Obsidian vault documents:**

1. Call `list_projects` (or read `repos.json` directly from the GitPanel data dir) to get the vault's `localPath`.
2. Use `Glob` with pattern `**/*.md` on that path to list all notes.
3. Use `Read` to open individual files, or `Grep` to search across notes.

**Shortcut — data dir is known:** On Windows, the GitPanel data files live at:
- Dev mode: `%APPDATA%\@gitpanel\desktop\`
- Packaged: `%APPDATA%\GitPanel\`

`repos.json` inside that directory lists all watched projects with their `localPath` values.

## Important notes

- Changes made via MCP are reflected in the GitPanel UI within seconds (file watcher triggers a reload).
- GitHub cards are read-only: use `move_card` to reposition them, but never `update_task` or `delete_task` on `gh:` IDs.
- If `get_board_summary` shows all zeros, open GitPanel at least once so it creates its data files.
