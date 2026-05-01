export default function Loading() {
  return (
    <div className="px-6 py-8 max-w-5xl mx-auto">
      {/* Top indeterminate progress bar so the user knows the click registered */}
      <div
        aria-hidden
        className="fixed top-0 left-0 right-0 h-[2px] z-50 overflow-hidden bg-transparent"
      >
        <div className="absolute inset-y-0 w-1/3 bg-accent loading-stripe" />
      </div>

      <div role="status" aria-live="polite" className="space-y-8">
        <span className="sr-only">Loading…</span>

        <div className="space-y-3">
          <div className="h-3 w-24 bg-bg-surface rounded animate-pulse" />
          <div className="h-9 w-64 bg-bg-surface rounded animate-pulse" />
        </div>

        <div className="grid gap-3">
          <div className="h-24 bg-bg-surface rounded-2xl border border-border animate-pulse" />
          <div className="h-40 bg-bg-surface rounded-2xl border border-border animate-pulse" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 bg-bg-surface rounded-xl border border-border animate-pulse"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
