import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import type { DeviceCodeResponse, DeviceFlowProgress } from '@shared/types/auth'

export function GitHubAuthSection() {
  const status = useAuthStore((s) => s.status)
  const refresh = useAuthStore((s) => s.refresh)
  const logout = useAuthStore((s) => s.logout)

  const [code, setCode] = useState<DeviceCodeResponse | null>(null)
  const [progress, setProgress] = useState<DeviceFlowProgress | null>(null)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const off = window.api.auth.onDeviceProgress((p) => {
      setProgress(p)
      if (p.status === 'authorized') {
        setCode(null)
        void refresh()
      }
    })
    return off
  }, [refresh])

  const startFlow = async () => {
    setError(null)
    setStarting(true)
    const res = await window.api.auth.startDeviceFlow()
    setStarting(false)
    if (res.data) {
      setCode(res.data)
      setProgress({ status: 'pending' })
    } else {
      setError(res.error?.message ?? 'Failed to start auth')
    }
  }

  const cancelFlow = async () => {
    await window.api.auth.cancelDeviceFlow()
    setCode(null)
    setProgress(null)
  }

  if (!status) return <div className="text-xs text-panel-muted">Loading…</div>

  // Already signed in
  if (status.user) {
    return (
      <div className="rounded-md border border-panel-border bg-panel-surface/40 p-3 text-sm">
        <div className="flex items-center gap-3">
          {status.user.avatarUrl && (
            <img src={status.user.avatarUrl} alt="" className="h-10 w-10 rounded-full" />
          )}
          <div className="flex-1 min-w-0">
            <div className="font-medium">{status.user.name ?? status.user.login}</div>
            <div className="text-xs text-panel-muted truncate">
              @{status.user.login} ·{' '}
              {status.mode === 'env-token' ? 'token via .env' : 'OAuth (device flow)'}
            </div>
          </div>
          {status.mode !== 'env-token' && (
            <button onClick={() => void logout()} className="btn text-xs">Sign out</button>
          )}
        </div>
        {status.mode === 'env-token' && (
          <div className="mt-2 text-xs text-panel-muted">
            Token source: <code className="font-mono">GITHUB_TOKEN</code> in <code className="font-mono">.env</code>. Remove the variable to switch to OAuth.
          </div>
        )}
      </div>
    )
  }

  // Mid-flow
  if (code && progress?.status !== 'authorized') {
    const msg = progress?.status === 'expired'
      ? 'Code expired. Start again.'
      : progress?.status === 'denied'
      ? 'Access denied.'
      : progress?.status === 'error'
      ? progress.message
      : 'Waiting for authorization on github.com…'

    return (
      <div className="rounded-md border border-panel-border bg-panel-surface/40 p-4">
        <div className="text-xs text-panel-muted mb-1">Enter this code at</div>
        <a
          href={code.verificationUri}
          target="_blank"
          rel="noreferrer"
          className="text-panel-accent text-sm hover:underline"
        >
          {code.verificationUri}
        </a>
        <div className="mt-3 font-mono text-3xl tracking-widest text-center py-3 bg-panel-bg rounded border border-panel-border select-all">
          {code.userCode}
        </div>
        <div className="mt-3 text-xs text-panel-muted">{msg}</div>
        <div className="mt-3 flex gap-2">
          <button onClick={cancelFlow} className="btn text-xs">Cancel</button>
          {(progress?.status === 'expired' || progress?.status === 'error') && (
            <button onClick={() => void startFlow()} className="btn-primary text-xs">Retry</button>
          )}
        </div>
      </div>
    )
  }

  // Not signed in
  return (
    <div className="space-y-3">
      <p className="text-xs text-panel-muted">
        Sign in with GitHub to sync Issues and PRs from your repos into the board.
        GitPanel works without GitHub too — you can use it as a local task board.
      </p>

      {!status.clientIdConfigured ? (
        <div className="rounded-md border border-panel-warning/40 bg-panel-warning/10 p-3 text-xs text-panel-warning">
          <div className="font-semibold mb-1">OAuth not configured</div>
          <div>
            To enable "Sign in with GitHub", set <code className="font-mono">GITHUB_CLIENT_ID</code> in <code className="font-mono">apps/desktop/.env</code> (a GitHub OAuth App with device flow enabled).
            Alternatively, set <code className="font-mono">GITHUB_TOKEN</code> to a Personal Access Token.
          </div>
        </div>
      ) : (
        <button onClick={() => void startFlow()} disabled={starting} className="btn-primary disabled:opacity-50">
          {starting ? 'Starting…' : 'Sign in with GitHub'}
        </button>
      )}

      {error && <div className="text-xs text-panel-danger">{error}</div>}
    </div>
  )
}
