import type { BrowserWindow } from 'electron'
import { registerTerminalIpc, disposeTerminalIpc } from './terminal'
import { registerStoreIpc } from './store'
import { registerAuthIpc, disposeAuthIpc } from './auth'
import { registerGithubIpc } from './github'
import { registerBoardIpc, disposeBoardIpc } from './board'
import { registerReposIpc } from './repos'
import { registerDialogIpc } from './dialog'
import { registerCloudIpc } from './cloud'

export type WindowProvider = () => BrowserWindow | null

export function registerIpc(getWindow: WindowProvider): void {
  registerTerminalIpc(getWindow)
  registerStoreIpc()
  registerAuthIpc(getWindow)
  registerGithubIpc()
  registerBoardIpc(getWindow)
  registerReposIpc()
  registerDialogIpc(getWindow)
  registerCloudIpc()
}

export function disposeIpc(): void {
  disposeTerminalIpc()
  disposeBoardIpc()
  disposeAuthIpc()
}
