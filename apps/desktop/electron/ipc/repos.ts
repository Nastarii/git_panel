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

export function registerReposIpc(): void {
  ipcMain.handle('repos:list', () => {
    return { data: reposStore.get('watched'), error: null }
  })

  ipcMain.handle('repos:add', (_evt, fullName: string, localPath?: string) => {
    const [owner, name] = fullName.split('/')
    if (!owner || !name) return { data: null, error: { code: 'BAD_REPO', message: `Invalid repo: ${fullName}` } }
    const watched = reposStore.get('watched')
    if (watched.some((r) => r.fullName.toLowerCase() === fullName.toLowerCase())) {
      return { data: null, error: { code: 'ALREADY_WATCHED', message: 'Repo already in list' } }
    }
    const repo: WatchedRepo = {
      id: randomUUID(),
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

  ipcMain.handle('repos:remove', (_evt, id: string) => {
    reposStore.set('watched', reposStore.get('watched').filter((r) => r.id !== id))
    return { data: true, error: null }
  })

  ipcMain.handle('repos:setLocalPath', (_evt, id: string, localPath: string | null) => {
    const watched = reposStore.get('watched').map((r) =>
      r.id === id ? { ...r, localPath: localPath ?? undefined } : r,
    )
    reposStore.set('watched', watched)
    return { data: true, error: null }
  })

  ipcMain.handle('repos:syncAll', async () => {
    const octo = client()
    if (!octo) return { data: null, error: { code: 'NOT_CONFIGURED', message: 'GitHub auth not configured' } }
    const watched = reposStore.get('watched')
    const all: BoardCard[] = []
    const errors: Array<{ repo: string; message: string }> = []

    for (const repo of watched) {
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
