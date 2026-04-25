import { useEffect, useState } from 'react'

interface Props {
  onDone: () => void
}

export function SplashScreen({ onDone }: Props) {
  const [phase, setPhase] = useState<'in' | 'hold' | 'out'>('in')

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('hold'), 600)
    const t2 = setTimeout(() => setPhase('out'), 1800)
    const t3 = setTimeout(onDone, 2400)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [onDone])

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-panel-bg"
      style={{
        opacity: phase === 'out' ? 0 : 1,
        transition: phase === 'out' ? 'opacity 0.6s ease-out' : 'none',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          opacity: phase === 'in' ? 0 : 1,
          transform: phase === 'in' ? 'scale(0.85)' : 'scale(1)',
          transition: 'opacity 0.5s ease-out, transform 0.5s ease-out',
        }}
      >
        <img
          src="./git_panel_logo.svg"
          alt="GitPanel"
          style={{ width: 112, height: 112, display: 'block' }}
        />
      </div>

      {/* reveal strip: the title slides up from behind this fixed-height clip */}
      <div style={{ marginTop: 20, height: 32, overflow: 'hidden' }}>
        <div
          style={{
            transform: phase === 'in' ? 'translateY(100%)' : 'translateY(0)',
            transition: 'transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)',
            transitionDelay: phase === 'in' ? '0ms' : '200ms',
          }}
        >
          <span
            className="text-panel-text font-sans font-semibold tracking-widest uppercase"
            style={{ fontSize: 18, letterSpacing: '0.22em' }}
          >
            GitPanel
          </span>
        </div>
      </div>
    </div>
  )
}
