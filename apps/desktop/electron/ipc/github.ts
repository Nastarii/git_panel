import { ipcMain } from 'electron'
import { Octokit } from '@octokit/rest'
import Store from 'electron-store'

const authStore = new Store<{ tokenCipher: string | null }>({ name: 'auth' })

function getToken(): string | null {
  // Decryption lives in auth.ts — for Phase 1 we keep GitHub calls stubbed and
  // return NOT_CONFIGURED until the full auth flow is wired in Phase 2.
  return null
}

function client(): Octokit | null {
  const token = getToken()
  return token ? new Octokit({ auth: token }) : null
}

export function registerGithubIpc(): void {
  ipcMain.handle('github:listIssues', async (_evt, repo: string) => {
    const octo = client()
    if (!octo) return { data: null, error: { code: 'NOT_CONFIGURED', message: 'GitHub auth not configured' } }
    const [owner, name] = repo.split('/')
    if (!owner || !name) return { data: null, error: { code: 'BAD_REPO', message: `Invalid repo: ${repo}` } }
    try {
      const { data } = await octo.issues.listForRepo({ owner, repo: name, state: 'open', per_page: 100 })
      return { data, error: null }
    } catch (err) {
      return { data: null, error: { code: 'GITHUB_ERROR', message: (err as Error).message } }
    }
  })

  ipcMain.handle('github:listPRs', async (_evt, repo: string) => {
    const octo = client()
    if (!octo) return { data: null, error: { code: 'NOT_CONFIGURED', message: 'GitHub auth not configured' } }
    const [owner, name] = repo.split('/')
    if (!owner || !name) return { data: null, error: { code: 'BAD_REPO', message: `Invalid repo: ${repo}` } }
    try {
      const { data } = await octo.pulls.list({ owner, repo: name, state: 'open', per_page: 100 })
      return { data, error: null }
    } catch (err) {
      return { data: null, error: { code: 'GITHUB_ERROR', message: (err as Error).message } }
    }
  })

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
}
