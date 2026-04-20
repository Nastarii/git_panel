import type { BrowserWindow } from 'electron'
import { registerTerminalIpc, disposeTerminalIpc } from './terminal'
import { registerStoreIpc } from './store'
import { registerAuthIpc } from './auth'
import { registerGithubIpc } from './github'
import { registerBoardIpc } from './board'
import { registerReposIpc } from './repos'
import { registerCloudIpc } from './cloud'

export type WindowProvider = () => BrowserWindow | null

export function registerIpc(getWindow: WindowProvider): void {
  registerTerminalIpc(getWindow)
  registerStoreIpc()
  registerAuthIpc(getWindow)
  registerGithubIpc()
  registerBoardIpc()
  registerReposIpc()
  registerCloudIpc()
}

export function disposeIpc(): void {
  disposeTerminalIpc()
}
