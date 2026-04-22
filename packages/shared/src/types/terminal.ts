export type TerminalCreateOptions = {
  cwd?: string
  shell?: string
  cols?: number
  rows?: number
}

export type TerminalTab = {
  id: string
  label: string
  cwd: string
  shell: string
  createdAt: string
  initialCommand?: string
}

export type TerminalResizePayload = {
  id: string
  cols: number
  rows: number
}

export type TerminalInputPayload = {
  id: string
  data: string
}
