import { ipcMain, dialog, BrowserWindow } from 'electron'
import type { WindowProvider } from './index'

export function registerDialogIpc(getWindow: WindowProvider): void {
  ipcMain.handle('dialog:selectDirectory', async (_evt, defaultPath?: string) => {
    const win = getWindow() ?? BrowserWindow.getFocusedWindow()
    const result = await dialog.showOpenDialog(win!, {
      title: 'Select a folder',
      defaultPath,
      properties: ['openDirectory', 'createDirectory'],
    })
    if (result.canceled || result.filePaths.length === 0) {
      return { data: null, error: null }
    }
    return { data: result.filePaths[0], error: null }
  })
}
