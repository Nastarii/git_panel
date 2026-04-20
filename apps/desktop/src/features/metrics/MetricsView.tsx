export function MetricsView() {
  return (
    <div className="h-full flex flex-col">
      <header className="border-b border-panel-border px-5 py-3">
        <h1 className="text-lg font-semibold">Metrics</h1>
        <p className="text-xs text-panel-muted">Throughput, lead time, review time.</p>
      </header>
      <div className="p-5 grid grid-cols-3 gap-4">
        {['Open issues', 'Closed this week', 'Avg lead time'].map((label) => (
          <div key={label} className="rounded-lg border border-panel-border bg-panel-surface/30 p-4">
            <div className="text-xs text-panel-muted">{label}</div>
            <div className="text-2xl font-semibold mt-2">—</div>
          </div>
        ))}
      </div>
    </div>
  )
}
