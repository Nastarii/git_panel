import { ipcMain } from 'electron'
import { Octokit } from '@octokit/rest'
import { resolveToken } from './auth'
import type { BoardCard } from '@shared/types/board'

function client(): Octokit | null {
  const { token } = resolveToken()
  return token ? new Octokit({ auth: token }) : null
}

function mapIssueToCard(
  i: {
    id: number
    number: number
    title: string
    body?: string | null
    state: string
    html_url: string
    labels: Array<string | { name?: string }>
    assignee?: { login: string } | null
    created_at: string
    updated_at: string
    pull_request?: unknown
  },
  repo: string,
): BoardCard {
  const isPR = !!i.pull_request
  return {
    id: `gh:${repo}#${i.number}`,
    provider: 'github',
    githubId: i.id,
    title: i.title,
    body: i.body ?? undefined,
    type: isPR ? 'pr' : 'issue',
    state: i.state === 'closed' ? 'closed' : 'open',
    repo,
    url: i.html_url,
    labels: i.labels
      .map((l) => (typeof l === 'string' ? l : l.name ?? ''))
      .filter(Boolean),
    assignee: i.assignee?.login,
    column: i.state === 'closed' ? 'done' : 'backlog',
    position: 0,
    createdAt: i.created_at,
    updatedAt: i.updated_at,
  }
}

export function registerGithubIpc(): void {
  ipcMain.handle('github:me', async () => {
    const octo = client()
    if (!octo) return { data: null, error: { code: 'NOT_CONFIGURED', message: 'GitHub auth not configured' } }
    try {
      const { data } = await octo.users.getAuthenticated()
      return { data, error: null }
    } catch (err) {
      return { data: null, error: { code: 'GITHUB_ERROR', message: (err as Error).message } }
    }
  })

  ipcMain.handle('github:fetchRepoCards', async (_evt, repo: string) => {
    const octo = client()
    if (!octo) return { data: null, error: { code: 'NOT_CONFIGURED', message: 'GitHub auth not configured' } }
    const [owner, name] = repo.split('/')
    if (!owner || !name) return { data: null, error: { code: 'BAD_REPO', message: `Invalid repo: ${repo}` } }
    try {
      const { data } = await octo.issues.listForRepo({
        owner,
        repo: name,
        state: 'open',
        per_page: 100,
      })
      const cards = data.map((i) => mapIssueToCard(i as never, repo))
      return { data: cards, error: null }
    } catch (err) {
      return { data: null, error: { code: 'GITHUB_ERROR', message: (err as Error).message } }
    }
  })

  ipcMain.handle('github:searchRepos', async (_evt, query: string) => {
    const octo = client()
    if (!octo) return { data: null, error: { code: 'NOT_CONFIGURED', message: 'GitHub auth not configured' } }
    try {
      const { data } = await octo.search.repos({ q: query, per_page: 10 })
      return { data: data.items, error: null }
    } catch (err) {
      return { data: null, error: { code: 'GITHUB_ERROR', message: (err as Error).message } }
    }
  })

  ipcMain.handle('github:listMyRepos', async () => {
    const octo = client()
    if (!octo) return { data: null, error: { code: 'NOT_CONFIGURED', message: 'GitHub auth not configured' } }
    try {
      // Paginate across all affiliations so users see personal + org repos.
      const repos = await octo.paginate(octo.repos.listForAuthenticatedUser, {
        per_page: 100,
        sort: 'updated',
        affiliation: 'owner,collaborator,organization_member',
      })
      const simplified = repos.map((r) => ({
        id: r.id,
        fullName: r.full_name,
        owner: r.owner.login,
        name: r.name,
        private: r.private,
        description: r.description ?? undefined,
        defaultBranch: r.default_branch,
        updatedAt: r.updated_at,
        openIssues: r.open_issues_count,
        archived: r.archived,
      }))
      return { data: simplified, error: null }
    } catch (err) {
      return { data: null, error: { code: 'GITHUB_ERROR', message: (err as Error).message } }
    }
  })
}
