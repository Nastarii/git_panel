export type GithubUser = {
  id: number
  login: string
  name?: string
  email?: string
  avatarUrl?: string
}

export type RepoKind = 'github' | 'local'

export type WatchedRepo = {
  id: string
  kind: RepoKind            // 'github' = synced via API; 'local' = manual project on disk
  fullName: string          // for github: "owner/repo"; for local: display name
  owner?: string            // github only
  name?: string             // github only (short name)
  localPath?: string        // optional clone / folder location
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
