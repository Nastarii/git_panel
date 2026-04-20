# GitPanel

> Aplicativo desktop que centraliza Issues e Pull Requests do GitHub em um sistema pessoal de produtividade — Kanban, métricas, multi-repo e terminal integrado em um único painel.

GitPanel substitui a fragmentação entre GitHub, Jira, Notion e terminais separados por uma experiência única e focada — para uso individual ou em equipe.

---

## Modos de Uso

| Modo | Descrição | Armazenamento |
|---|---|---|
| **Local** | Uso solo, offline-first | `electron-store` (no dispositivo) |
| **Cloud** | Uso em equipe | REST API self-hostável + PostgreSQL |

---

## Features

- **Board Kanban** — drag-and-drop de Issues e PRs entre colunas (`Backlog → To Do → In Progress → Review → Done`)
- **Multi-repo sync** — acompanhe vários repositórios no mesmo painel
- **Métricas** — throughput, lead time, review time
- **Terminal integrado** — rode `claude`, `gh copilot`, `aider` ou qualquer CLI sem sair do GitPanel
- **Contexto por repositório** — cada aba de terminal abre automaticamente no `cwd` correto do repo ativo
- **Modo Cloud opcional** — sincronize o board entre membros da equipe via SSE em tempo real

---

## Stack Técnico

### Desktop

- Electron 31+ · React 18 · TypeScript · Tailwind CSS
- Zustand (state) · Octokit (GitHub) · xterm.js + node-pty (terminal)
- electron-vite (bundler) · electron-builder (distribuição)

### API (Cloud Mode)

- Node.js 20+ · Fastify · Prisma · PostgreSQL 15+
- JWT (auth) · SSE (realtime) · Docker

---

## Estrutura do Monorepo

```
gitpanel/
├── apps/
│   ├── desktop/         # Electron + React (local + cloud client)
│   └── api/             # Fastify + Prisma (cloud mode) — Fase 3
├── packages/
│   └── shared/          # Tipos de domínio compartilhados
├── turbo.json           # Pipeline do Turborepo
└── package.json         # Workspace root
```

---

## Começando

### Pré-requisitos

- **Node.js 20+**
- **npm 10+**
- **Windows:** Visual Studio Build Tools (necessário para compilar `node-pty`)
- **macOS:** Xcode Command Line Tools
- **Linux:** `build-essential` e `python3`

### Instalação

```bash
git clone <repo-url>
cd git_panel
npm install
```

### Desenvolvimento (apenas desktop)

```bash
npm run dev -w @gitpanel/desktop
```

A aplicação abre em uma janela Electron com DevTools ativado.

### Desenvolvimento (stack completa — Fase 3+)

```bash
docker-compose -f docker-compose.dev.yml up -d   # Postgres
npm run dev -w @gitpanel/api                     # API em :3333
npm run dev -w @gitpanel/desktop                 # Desktop
```

### Build de distribuição

```bash
npm run build -w @gitpanel/desktop
npm run dist  -w @gitpanel/desktop   # Gera instaladores para a plataforma atual
```

---

## Variáveis de Ambiente

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

## Status do Projeto

GitPanel está sendo desenvolvido em fases incrementais:

| Fase | Escopo | Status |
|---|---|---|
| **1 — Fundação** | Monorepo, shell Electron, terminal integrado, tipos compartilhados | ✅ Concluída |
| **2 — GitHub** | OAuth, listagem de repos, Kanban drag-and-drop, sync de Issues/PRs | ⏳ Planejada |
| **3 — API Cloud** | Fastify, Prisma, auth JWT, workspaces, membros | ⏳ Planejada |
| **4 — Realtime** | SSE sync do board, métricas, permissões por workspace | ⏳ Planejada |

---

## Arquitetura

### Modo Local

```
Renderer (React) --IPC--> Main (Electron) --> GitHub API
                 <--IPC--               <-- electron-store
                    |
              Terminal IPC
                    |
            node-pty (main) --> shell (bash/zsh/pwsh)
```

### Modo Cloud

```
Renderer (React) --IPC--> Main (Electron) --> GitHub API
                 <--IPC--        |
                                 | HTTP / SSE
                                 v
                           Fastify API --> PostgreSQL
```

---

## Segurança

- `contextIsolation: true` e `nodeIntegration: false` — sempre
- Shell do terminal resolvido a partir de `SHELL`/`COMSPEC` do SO, nunca aceito do renderer
- `cwd` passado pelo renderer é validado como diretório existente no processo main antes do spawn
- Tokens GitHub criptografados com `safeStorage` do Electron
- Tokens AES-256 no PostgreSQL (modo Cloud)
- JWT access tokens expiram em 15 min; refresh em 30 dias

---

## Contribuindo

Este é um projeto em desenvolvimento ativo. Consulte o [CLAUDE.md](CLAUDE.md) para contexto completo de arquitetura, convenções e regras de segurança que guiam contribuições (humanas ou de assistentes de IA).

### Convenções

- TypeScript strict em toda parte — sem `any`
- Tipos de domínio em `packages/shared` — nunca duplicar entre apps
- Sem chamadas diretas à GitHub API a partir do renderer — sempre via IPC
- Handlers de IPC retornam `{ data, error }`, nunca lançam exceções através do boundary
- Sessões PTY vivem exclusivamente no processo main

---

## Licença

MIT — veja [LICENSE.md](LICENSE.md).
