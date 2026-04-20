import { GitHubAuthSection } from './GitHubAuthSection'

export function SettingsView() {
  return (
    <div className="h-full flex flex-col overflow-y-auto">
      <header className="border-b border-panel-border px-5 py-3">
        <h1 className="text-lg font-semibold">Settings</h1>
        <p className="text-xs text-panel-muted">GitHub auth, cloud mode, terminal defaults.</p>
      </header>
      <div className="p-5 space-y-8 max-w-2xl w-full">
        <section>
          <h2 className="text-sm font-semibold mb-3">GitHub</h2>
          <GitHubAuthSection />
        </section>

        <section>
          <h2 className="text-sm font-semibold mb-2">Cloud mode</h2>
          <p className="text-xs text-panel-muted mb-2">
            Sync your board across devices and collaborate with a team through a self-hostable GitPanel API.
          </p>
          <button className="btn" disabled>Connect to API (Phase 3)</button>
        </section>

        <section>
          <h2 className="text-sm font-semibold mb-2">Terminal</h2>
          <p className="text-xs text-panel-muted">
            Shell is auto-resolved from <code className="font-mono">SHELL</code> / <code className="font-mono">COMSPEC</code>.
            Each terminal tab is an independent PTY session.
          </p>
        </section>

        <section>
          <h2 className="text-sm font-semibold mb-2">Storage</h2>
          <p className="text-xs text-panel-muted">
            Local cards and board overrides are stored via <code className="font-mono">electron-store</code> under your user profile.
            Tokens are encrypted with OS keystore (<code className="font-mono">safeStorage</code>).
          </p>
        </section>
      </div>
    </div>
  )
}
