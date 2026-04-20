import { contextBridge, ipcRenderer } from 'electron'
import type { IpcRendererEvent } from 'electron'
import type { TerminalCreateOptions } from '@shared/types/terminal'
import type { ApiResult } from '@shared/types/api'

const terminal = {
  create: (opts: TerminalCreateOptions = {}): Promise<{ id: string; cwd: string; shell: string }> =>
    ipcRenderer.invoke('terminal:create', opts),

  input: (id: string, data: string): void =>
    ipcRenderer.send('terminal:input', { id, data }),

  resize: (id: string, cols: number, rows: number): void =>
    ipcRenderer.send('terminal:resize', { id, cols, rows }),

  kill: (id: string): Promise<boolean> =>
    ipcRenderer.invoke('terminal:kill', id),

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
  set: (key: string, value: unknown): Promise<ApiResult<boolean>> => ipcRenderer.invoke('store:set', key, value),
  delete: (key: string): Promise<ApiResult<boolean>> => ipcRenderer.invoke('store:delete', key),
}

const auth = {
  status: (): Promise<ApiResult<{ user: unknown; hasToken: boolean }>> => ipcRenderer.invoke('auth:status'),
  startGithub: (): Promise<ApiResult<null>> => ipcRenderer.invoke('auth:startGithub'),
  logout: (): Promise<ApiResult<boolean>> => ipcRenderer.invoke('auth:logout'),
}

const github = {
  me: (): Promise<ApiResult<unknown>> => ipcRenderer.invoke('github:me'),
  listIssues: (repo: string): Promise<ApiResult<unknown>> => ipcRenderer.invoke('github:listIssues', repo),
  listPRs: (repo: string): Promise<ApiResult<unknown>> => ipcRenderer.invoke('github:listPRs', repo),
}

const cloud = {
  status: (): Promise<ApiResult<{ connected: boolean; apiUrl: string | null }>> => ipcRenderer.invoke('cloud:status'),
  connect: (): Promise<ApiResult<null>> => ipcRenderer.invoke('cloud:connect'),
  fetchBoard: (): Promise<ApiResult<null>> => ipcRenderer.invoke('cloud:fetchBoard'),
  patchCards: (): Promise<ApiResult<null>> => ipcRenderer.invoke('cloud:patchCards'),
}

export const api = { terminal, store, auth, github, cloud }
export type GitPanelApi = typeof api

contextBridge.exposeInMainWorld('api', api)
