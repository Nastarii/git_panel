import { ipcMain } from 'electron'
import Store from 'electron-store'
import { Octokit } from '@octokit/rest'
import { randomUUID } from 'node:crypto'
import { resolveToken } from './auth'
import { applyOverrides } from './board'
import type { WatchedRepo } from '@shared/types/github'
import type { BoardCard } from '@shared/types/board'

type ReposSchema = { watched: WatchedRepo[] }

const reposStore = new Store<ReposSchema>({
  name: 'repos',
  defaults: { watched: [] },
})

function client(): Octokit | null {
  const { token } = resolveToken()
  return token ? new Octokit({ auth: token }) : null
}

function ensureKind(r: WatchedRepo): WatchedRepo {
  // Migrate pre-kind entries (saved before the local-project feature shipped).
  if (r.kind) return r
  return { ...r, kind: 'github' }
}

function readWatched(): WatchedRepo[] {
  const list = reposStore.get('watched').map(ensureKind)
  // Persist the migration so we do not re-apply it next read.
  const needsWrite = list.some((r, i) => r !== reposStore.get('watched')[i])
  if (needsWrite) reposStore.set('watched', list)
  return list
}

export function registerReposIpc(): void {
  ipcMain.handle('repos:list', () => {
    return { data: readWatched(), error: null }
  })

  ipcMain.handle('repos:addGithub', (_evt, fullName: string, localPath?: string) => {
    const [owner, name] = fullName.split('/')
    if (!owner || !name) return { data: null, error: { code: 'BAD_REPO', message: `Invalid repo: ${fullName}` } }
    const watched = readWatched()
    if (watched.some((r) => r.kind === 'github' && r.fullName.toLowerCase() === fullName.toLowerCase())) {
      return { data: null, error: { code: 'ALREADY_WATCHED', message: 'Repo already in list' } }
    }
    const repo: WatchedRepo = {
      id: randomUUID(),
      kind: 'github',
      fullName,
      owner,
      name,
      localPath,
      private: false,
      addedAt: new Date().toISOString(),
    }
    reposStore.set('watched', [...watched, repo])
    return { data: repo, error: null }
  })

  ipcMain.handle('repos:addLocal', (_evt, name: string, localPath?: string) => {
    const trimmed = name.trim()
    if (!trimmed) return { data: null, error: { code: 'BAD_NAME', message: 'Project name is required' } }
    const watched = readWatched()
    if (watched.some((r) => r.kind === 'local' && r.fullName.toLowerCase() === trimmed.toLowerCase())) {
      return { data: null, error: { code: 'ALREADY_WATCHED', message: 'A local project with that name already exists' } }
    }
    const repo: WatchedRepo = {
      id: randomUUID(),
      kind: 'local',
      fullName: trimmed,
      localPath,
      private: false,
      addedAt: new Date().toISOString(),
    }
    reposStore.set('watched', [...watched, repo])
    return { data: repo, error: null }
  })

  // Back-compat: old renderer code still calls this.
  ipcMain.handle('repos:add', (_evt, fullName: string, localPath?: string) => {
    return withGithubAdd(fullName, localPath)
  })

  ipcMain.handle('repos:remove', (_evt, id: string) => {
    reposStore.set('watched', readWatched().filter((r) => r.id !== id))
    return { data: true, error: null }
  })

  ipcMain.handle('repos:update', (_evt, id: string, patch: Partial<Pick<WatchedRepo, 'fullName' | 'localPath'>>) => {
    const watched = readWatched()
    const idx = watched.findIndex((r) => r.id === id)
    if (idx === -1) return { data: null, error: { code: 'NOT_FOUND', message: `repo ${id}` } }
    const existing = watched[idx]!
    const updated: WatchedRepo = {
      ...existing,
      ...patch,
      fullName: patch.fullName?.trim() || existing.fullName,
      // localPath can be explicitly cleared by passing null/undefined string
      localPath: 'localPath' in patch ? (patch.localPath || undefined) : existing.localPath,
    }
    const next = [...watched]
    next[idx] = updated
    reposStore.set('watched', next)
    return { data: updated, error: null }
  })

  ipcMain.handle('repos:setLocalPath', (_evt, id: string, localPath: string | null) => {
    const watched = readWatched().map((r) =>
      r.id === id ? { ...r, localPath: localPath ?? undefined } : r,
    )
    reposStore.set('watched', watched)
    return { data: true, error: null }
  })

  ipcMain.handle('repos:syncAll', async () => {
    const octo = client()
    if (!octo) return { data: null, error: { code: 'NOT_CONFIGURED', message: 'GitHub auth not configured' } }
    const githubRepos = readWatched().filter((r) => r.kind === 'github')
    const all: BoardCard[] = []
    const errors: Array<{ repo: string; message: string }> = []

    for (const repo of githubRepos) {
      if (!repo.owner || !repo.name) continue
      try {
        const { data } = await octo.issues.listForRepo({
          owner: repo.owner,
          repo: repo.name,
          state: 'open',
          per_page: 100,
        })
        for (const i of data) {
          const isPR = !!i.pull_request
          all.push({
            id: `gh:${repo.fullName}#${i.number}`,
            provider: 'github',
            githubId: i.id,
            title: i.title,
            body: i.body ?? undefined,
            type: isPR ? 'pr' : 'issue',
            state: i.state === 'closed' ? 'closed' : 'open',
            repo: repo.fullName,
            repoId: repo.id,
            url: i.html_url,
            labels: (i.labels ?? [])
              .map((l) => (typeof l === 'string' ? l : l.name ?? ''))
              .filter(Boolean) as string[],
            assignee: i.assignee?.login,
            column: i.state === 'closed' ? 'done' : 'backlog',
            position: new Date(i.updated_at).getTime(),
            createdAt: i.created_at,
            updatedAt: i.updated_at,
          })
        }
      } catch (err) {
        errors.push({ repo: repo.fullName, message: (err as Error).message })
      }
    }

    return { data: { cards: applyOverrides(all), errors }, error: null }
  })
}

function withGithubAdd(fullName: string, localPath?: string): { data: WatchedRepo | null; error: { code: string; message: string } | null } {
  const [owner, name] = fullName.split('/')
  if (!owner || !name) return { data: null, error: { code: 'BAD_REPO', message: `Invalid repo: ${fullName}` } }
  const watched = readWatched()
  if (watched.some((r) => r.kind === 'github' && r.fullName.toLowerCase() === fullName.toLowerCase())) {
    return { data: null, error: { code: 'ALREADY_WATCHED', message: 'Repo already in list' } }
  }
  const repo: WatchedRepo = {
    id: randomUUID(),
    kind: 'github',
    fullName,
    owner,
    name,
    localPath,
    private: false,
    addedAt: new Date().toISOString(),
  }
  reposStore.set('watched', [...watched, repo])
  return { data: repo, error: null }
}
