import { useEffect, useState } from 'react'

const IS_MAC = navigator.userAgent.includes('Macintosh')

function MinimizeIcon() {
  return (
    <svg width="10" height="1" viewBox="0 0 10 1" fill="none">
      <rect width="10" height="1" rx="0.5" fill="currentColor" />
    </svg>
  )
}

function MaximizeIcon({ isMaximized }: { isMaximized: boolean }) {
  if (isMaximized) {
    return (
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
        <path
          d="M3 1H9V7M1 3H7V9H1V3Z"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <rect x="0.5" y="0.5" width="9" height="9" rx="0.5" stroke="currentColor" strokeWidth="1" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <path
        d="M1 1L9 9M9 1L1 9"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    if (IS_MAC) return
    window.api.windowControls.isMaximized().then(setIsMaximized)
    return window.api.windowControls.onMaximizeChange(setIsMaximized)
  }, [])

  if (IS_MAC) return null

  return (
    <div
      className="flex items-center justify-between shrink-0 bg-panel-bg border-b border-panel-border"
      style={{ height: 36, WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* Left: logo + title */}
      <div className="flex items-center gap-2 px-3">
        <img src="/git_panel_logo.svg" alt="" style={{ width: 14, height: 14 }} />
        <span className="text-panel-muted text-xs font-medium tracking-wide select-none">
          GitPanel
        </span>
      </div>

      {/* Window controls */}
      <div
        className="flex items-center h-full"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <button
          onClick={() => window.api.windowControls.minimize()}
          className="flex items-center justify-center h-full px-4 text-panel-muted hover:text-panel-text hover:bg-panel-surface transition-colors"
          title="Minimizar"
        >
          <MinimizeIcon />
        </button>
        <button
          onClick={() => window.api.windowControls.maximize()}
          className="flex items-center justify-center h-full px-4 text-panel-muted hover:text-panel-text hover:bg-panel-surface transition-colors"
          title={isMaximized ? 'Restaurar' : 'Maximizar'}
        >
          <MaximizeIcon isMaximized={isMaximized} />
        </button>
        <button
          onClick={() => window.api.windowControls.close()}
          className="flex items-center justify-center h-full px-4 text-panel-muted hover:text-white hover:bg-panel-danger transition-colors"
          title="Fechar"
        >
          <CloseIcon />
        </button>
      </div>
    </div>
  )
}
