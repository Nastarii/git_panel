import { useRef } from 'react'
import clsx from 'clsx'
import { useTerminal } from './useTerminal'

type Props = {
  id: string
  active: boolean
  initialCommand?: string
}

export function TerminalView({ id, active, initialCommand }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  useTerminal({ containerRef: ref, termId: id, active, initialCommand })

  return (
    <div
      ref={ref}
      className={clsx(
        'xterm-container h-full w-full bg-panel-bg',
        active ? 'block' : 'hidden',
      )}
    />
  )
}
