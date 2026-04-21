import { contextBridge, ipcRenderer } from 'electron'
import type { IpcRendererEvent } from 'electron'
import type { TerminalCreateOptions } from '@shared/types/terminal'
import type { ApiResult } from '@shared/types/api'
import type {
  AuthStatus,
  DeviceCodeResponse,
  DeviceFlowProgress,
} from '@shared/types/auth'
import type { BoardCard, CardPatch, NewLocalCard } from '@shared/types/board'
import type { WatchedRepo } from '@shared/types/github'

const terminal = {
  create: (opts: TerminalCreateOptions = {}): Promise<{ id: string; cwd: string; shell: string }> =>
    ipcRenderer.invoke('terminal:create', opts),
  input: (id: string, data: string): void => ipcRenderer.send('terminal:input', { id, data }),
  resize: (id: string, cols: number, rows: number): void =>
    ipcRenderer.send('terminal:resize', { id, cols, rows }),
  kill: (id: string): Promise<boolean> => ipcRenderer.invoke('terminal:kill', id),
  list: (): Promise<Array<{ id: string; shell: string; cwd: string }>> =>
    ipcRenderer.invoke('terminal:list'),
  onData: (id: string, cb: (data: string) => void): (() => void) => {
    const channel = `terminal:data:${id}`
    const handler = (_e: IpcRendererEvent, data: string) => cb(data)
    ipcRenderer.on(channel, handler)
    return () => ipcRenderer.removeListener(channel, handler)
  },
  onExit: (id: string, cb: (info: { exitCode: number; signal?: number }) => void): (() => void) => {
    const channel = `terminal:exit:${id}`
    const handler = (_e: IpcRendererEvent, info: { exitCode: number; signal?: number }) => cb(info)
    ipcRenderer.on(channel, handler)
    return () => ipcRenderer.removeListener(channel, handler)
  },
}

const store = {
  get: <T = unknown>(key: string): Promise<ApiResult<T>> => ipcRenderer.invoke('store:get', key),
  set: (key: string, value: unknown): Promise<ApiResult<boolean>> =>
    ipcRenderer.invoke('store:set', key, value),
  delete: (key: string): Promise<ApiResult<boolean>> => ipcRenderer.invoke('store:delete', key),
}

const auth = {
  status: (): Promise<ApiResult<AuthStatus>> => ipcRenderer.invoke('auth:status'),
  startDeviceFlow: (): Promise<ApiResult<DeviceCodeResponse>> =>
    ipcRenderer.invoke('auth:startDeviceFlow'),
  cancelDeviceFlow: (): Promise<ApiResult<boolean>> => ipcRenderer.invoke('auth:cancelDeviceFlow'),
  logout: (): Promise<ApiResult<boolean>> => ipcRenderer.invoke('auth:logout'),
  onDeviceProgress: (cb: (p: DeviceFlowProgress) => void): (() => void) => {
    const handler = (_e: IpcRendererEvent, p: DeviceFlowProgress) => cb(p)
    ipcRenderer.on('auth:device:progress', handler)
    return () => ipcRenderer.removeListener('auth:device:progress', handler)
  },
}

export type GithubRepoSummary = {
  id: number
  fullName: string
  owner: string
  name: string
  private: boolean
  description?: string
  defaultBranch: string
  updatedAt: string | null
  openIssues: number
  archived: boolean
}

const github = {
  me: (): Promise<ApiResult<unknown>> => ipcRenderer.invoke('github:me'),
  fetchRepoCards: (repo: string): Promise<ApiResult<BoardCard[]>> =>
    ipcRenderer.invoke('github:fetchRepoCards', repo),
  searchRepos: (query: string): Promise<ApiResult<unknown>> =>
    ipcRenderer.invoke('github:searchRepos', query),
  listMyRepos: (): Promise<ApiResult<GithubRepoSummary[]>> =>
    ipcRenderer.invoke('github:listMyRepos'),
  createIssue: (
    repoFullName: string,
    input: { title: string; body?: string; labels?: string[] },
  ): Promise<ApiResult<BoardCard>> =>
    ipcRenderer.invoke('github:createIssue', repoFullName, input),
}

const board = {
  listLocal: (): Promise<ApiResult<BoardCard[]>> => ipcRenderer.invoke('board:listLocal'),
  createLocal: (input: NewLocalCard): Promise<ApiResult<BoardCard>> =>
    ipcRenderer.invoke('board:createLocal', input),
  updateLocal: (id: string, patch: Partial<BoardCard>): Promise<ApiResult<BoardCard>> =>
    ipcRenderer.invoke('board:updateLocal', id, patch),
  deleteLocal: (id: string): Promise<ApiResult<boolean>> => ipcRenderer.invoke('board:deleteLocal', id),
  applyPatches: (patches: CardPatch[]): Promise<ApiResult<boolean>> =>
    ipcRenderer.invoke('board:applyPatches', patches),
  clearOverrides: (): Promise<ApiResult<boolean>> => ipcRenderer.invoke('board:clearOverrides'),
  onExternalChange: (cb: () => void): (() => void) => {
    const handler = () => cb()
    ipcRenderer.on('board:external-change', handler)
    return () => ipcRenderer.removeListener('board:external-change', handler)
  },
}

const repos = {
  list: (): Promise<ApiResult<WatchedRepo[]>> => ipcRenderer.invoke('repos:list'),
  addGithub: (fullName: string, localPath?: string): Promise<ApiResult<WatchedRepo>> =>
    ipcRenderer.invoke('repos:addGithub', fullName, localPath),
  addLocal: (name: string, localPath?: string): Promise<ApiResult<WatchedRepo>> =>
    ipcRenderer.invoke('repos:addLocal', name, localPath),
  remove: (id: string): Promise<ApiResult<boolean>> => ipcRenderer.invoke('repos:remove', id),
  update: (
    id: string,
    patch: Partial<Pick<WatchedRepo, 'fullName' | 'localPath'>>,
  ): Promise<ApiResult<WatchedRepo>> => ipcRenderer.invoke('repos:update', id, patch),
  setLocalPath: (id: string, localPath: string | null): Promise<ApiResult<boolean>> =>
    ipcRenderer.invoke('repos:setLocalPath', id, localPath),
  syncAll: (): Promise<
    ApiResult<{ cards: BoardCard[]; errors: Array<{ repo: string; message: string }> }>
  > => ipcRenderer.invoke('repos:syncAll'),
}

const dialog = {
  selectDirectory: (defaultPath?: string): Promise<ApiResult<string | null>> =>
    ipcRenderer.invoke('dialog:selectDirectory', defaultPath),
}

const cloud = {
  status: (): Promise<ApiResult<{ connected: boolean; apiUrl: string | null }>> =>
    ipcRenderer.invoke('cloud:status'),
  connect: (): Promise<ApiResult<null>> => ipcRenderer.invoke('cloud:connect'),
  fetchBoard: (): Promise<ApiResult<null>> => ipcRenderer.invoke('cloud:fetchBoard'),
  patchCards: (): Promise<ApiResult<null>> => ipcRenderer.invoke('cloud:patchCards'),
}

export const api = { terminal, store, auth, github, board, repos, dialog, cloud }
export type GitPanelApi = typeof api

contextBridge.exposeInMainWorld('api', api)
