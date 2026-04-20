import { useRef } from 'react'
import clsx from 'clsx'
import { useTerminal } from './useTerminal'

type Props = {
  id: string
  active: boolean
}

export function TerminalView({ id, active }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  useTerminal({ containerRef: ref, termId: id, active })

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
