import { ipcMain } from 'electron'
import { spawn, type IPty } from 'node-pty'
import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import type { WindowProvider } from './index'
import { getSetting } from './store'
import type { TerminalCreateOptions } from '@shared/types/terminal'

type Session = {
  id: string
  pty: IPty
  shell: string
  cwd: string
}

const sessions = new Map<string, Session>()

function defaultShell(): string {
  if (process.platform === 'win32') {
    return process.env['COMSPEC'] ?? 'powershell.exe'
  }
  return process.env['SHELL'] ?? '/bin/bash'
}

const ALLOWED_SHELLS = new Set(
  process.platform === 'win32'
    ? ['powershell.exe', 'pwsh.exe', 'cmd.exe', 'bash.exe']
    : ['/bin/bash', '/bin/zsh', '/bin/sh', '/usr/bin/fish', '/bin/fish', '/usr/local/bin/fish'],
)

function resolveShell(requested?: string): string {
  if (!requested) return defaultShell()
  const normalized = process.platform === 'win32' ? path.basename(requested).toLowerCase() : requested
  if (ALLOWED_SHELLS.has(normalized)) return requested
  return defaultShell()
}

function resolveCwd(requested?: string): string {
  const candidates = [
    requested,
    getSetting<string>('terminal.defaultCwd'),
    process.cwd(),
  ]
  for (const candidate of candidates) {
    if (!candidate) continue
    try {
      const absolute = path.resolve(candidate)
      if (fs.statSync(absolute).isDirectory()) return absolute
    } catch {
      continue
    }
  }
  return os.homedir()
}

export function registerTerminalIpc(getWindow: WindowProvider): void {
  ipcMain.handle('terminal:create', (_evt, opts: TerminalCreateOptions = {}) => {
    const shell = resolveShell(opts.shell)
    const cwd = resolveCwd(opts.cwd)
    const cols = opts.cols ?? 80
    const rows = opts.rows ?? 24

    const pty = spawn(shell, [], {
      name: 'xterm-color',
      cols,
      rows,
      cwd,
      env: process.env as Record<string, string>,
    })

    const id = randomUUID()
    const session: Session = { id, pty, shell, cwd }
    sessions.set(id, session)

    pty.onData((data) => {
      const win = getWindow()
      win?.webContents.send(`terminal:data:${id}`, data)
    })

    pty.onExit(({ exitCode, signal }) => {
      const win = getWindow()
      win?.webContents.send(`terminal:exit:${id}`, { exitCode, signal })
      sessions.delete(id)
    })

    return { id, cwd, shell }
  })

  ipcMain.on('terminal:input', (_evt, payload: { id: string; data: string }) => {
    sessions.get(payload.id)?.pty.write(payload.data)
  })

  ipcMain.on('terminal:resize', (_evt, payload: { id: string; cols: number; rows: number }) => {
    const s = sessions.get(payload.id)
    if (!s) return
    try {
      s.pty.resize(Math.max(1, payload.cols), Math.max(1, payload.rows))
    } catch {
      /* size race during teardown */
    }
  })

  ipcMain.handle('terminal:kill', (_evt, id: string) => {
    const s = sessions.get(id)
    if (!s) return false
    try { s.pty.kill() } catch { /* already gone */ }
    sessions.delete(id)
    return true
  })

  ipcMain.handle('terminal:list', () => {
    return Array.from(sessions.values()).map((s) => ({ id: s.id, shell: s.shell, cwd: s.cwd }))
  })
}

export function disposeTerminalIpc(): void {
  for (const { pty } of sessions.values()) {
    try { pty.kill() } catch { /* noop */ }
  }
  sessions.clear()
}
