export type GithubUser = {
  id: number
  login: string
  name?: string
  email?: string
  avatarUrl?: string
}

export type WatchedRepo = {
  id: string
  fullName: string
  owner: string
  name: string
  localPath?: string
  defaultBranch?: string
  private: boolean
  addedAt: string
}

export type GithubIssue = {
  id: number
  number: number
  title: string
  body?: string
  state: 'open' | 'closed'
  url: string
  repo: string
  labels: string[]
  assignee?: string
  createdAt: string
  updatedAt: string
}

export type GithubPR = GithubIssue & {
  merged: boolean
  draft: boolean
  baseRef: string
  headRef: string
}
