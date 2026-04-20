import { useEffect, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'

const theme = {
  background: '#0d1117',
  foreground: '#c9d1d9',
  cursor: '#58a6ff',
  cursorAccent: '#0d1117',
  selectionBackground: '#264f78',
  black: '#484f58',
  red: '#ff7b72',
  green: '#3fb950',
  yellow: '#d29922',
  blue: '#58a6ff',
  magenta: '#bc8cff',
  cyan: '#39c5cf',
  white: '#b1bac4',
  brightBlack: '#6e7681',
  brightRed: '#ffa198',
  brightGreen: '#56d364',
  brightYellow: '#e3b341',
  brightBlue: '#79c0ff',
  brightMagenta: '#d2a8ff',
  brightCyan: '#56d4dd',
  brightWhite: '#f0f6fc',
}

type UseTerminalArgs = {
  containerRef: React.RefObject<HTMLDivElement>
  termId: string
  active: boolean
}

export function useTerminal({ containerRef, termId, active }: UseTerminalArgs): void {
  const xtermRef = useRef<Terminal | null>(null)
  const fitRef = useRef<FitAddon | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const xterm = new Terminal({
      theme,
      fontFamily: 'JetBrains Mono, Menlo, monospace',
      fontSize: 13,
      cursorBlink: true,
      allowProposedApi: true,
      scrollback: 10_000,
    })
    const fit = new FitAddon()
    xterm.loadAddon(fit)
    xterm.loadAddon(new WebLinksAddon())

    xterm.open(containerRef.current)
    fit.fit()

    xtermRef.current = xterm
    fitRef.current = fit

    const offData = window.api.terminal.onData(termId, (data) => xterm.write(data))
    const offExit = window.api.terminal.onExit(termId, ({ exitCode }) => {
      xterm.writeln(`\r\n\x1b[90m[process exited with code ${exitCode}]\x1b[0m`)
    })

    const dataDisposable = xterm.onData((data) => window.api.terminal.input(termId, data))

    const handleResize = (): void => {
      if (!xtermRef.current || !fitRef.current) return
      fitRef.current.fit()
      window.api.terminal.resize(termId, xtermRef.current.cols, xtermRef.current.rows)
    }

    const ro = new ResizeObserver(handleResize)
    ro.observe(containerRef.current)
    window.addEventListener('resize', handleResize)

    // initial sync so PTY matches xterm's computed size
    handleResize()

    return () => {
      ro.disconnect()
      window.removeEventListener('resize', handleResize)
      dataDisposable.dispose()
      offData()
      offExit()
      xterm.dispose()
      xtermRef.current = null
      fitRef.current = null
    }
  }, [containerRef, termId])

  useEffect(() => {
    if (active && xtermRef.current && fitRef.current) {
      requestAnimationFrame(() => {
        fitRef.current?.fit()
        xtermRef.current?.focus()
        if (xtermRef.current) {
          window.api.terminal.resize(termId, xtermRef.current.cols, xtermRef.current.rows)
        }
      })
    }
  }, [active, termId])
}
