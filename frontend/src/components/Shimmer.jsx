/* Shimmer skeleton components for loading states */

export function ShimmerLine({ width = 'w-full', height = 'h-3', className = '' }) {
  return (
    <div
      className={`${height} ${width} ${className} rounded-md relative overflow-hidden`}
      style={{ background: 'var(--surface-overlay)' }}
    >
      <div className="shimmer-wave" />
    </div>
  );
}

export function ShimmerCard({ rows = 3, className = '' }) {
  return (
    <div className={`card p-5 space-y-3 ${className}`}>
      <ShimmerLine width="w-1/3" height="h-3" />
      <ShimmerLine width="w-full" height="h-8" />
      {rows > 2 && <ShimmerLine width="w-2/3" height="h-3" />}
    </div>
  );
}

export function ShimmerTable({ rows = 5, cols = 4 }) {
  return (
    <div className="card overflow-hidden">
      {/* header */}
      <div className="flex gap-4 px-5 py-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        {Array.from({ length: cols }).map((_, i) => (
          <ShimmerLine key={i} width="w-20" height="h-3" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className="flex gap-4 px-5 py-4 border-b"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          {Array.from({ length: cols }).map((_, c) => (
            <ShimmerLine
              key={c}
              width={c === 0 ? 'w-32' : c === cols - 1 ? 'w-16' : 'w-24'}
              height="h-3"
            />
          ))}
        </div>
      ))}
    </div>
  );
}

const SHIMMER_COLORS = ['#15803d', '#b45309', '#b91c1c', '#1d4ed8'];

export function ShimmerStatGrid({ count = 4 }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="relative overflow-hidden rounded-xl p-5 space-y-4"
          style={{ background: SHIMMER_COLORS[i % SHIMMER_COLORS.length], opacity: 0.5 }}
        >
          <div className="flex justify-between items-start">
            <div className="h-3 w-20 rounded" style={{ background: 'rgba(255,255,255,0.25)' }} />
            <div className="w-8 h-8 rounded-lg" style={{ background: 'rgba(0,0,0,0.2)' }} />
          </div>
          <div className="h-8 w-16 rounded" style={{ background: 'rgba(255,255,255,0.25)' }} />
          <div className="shimmer-wave" />
        </div>
      ))}
    </div>
  );
}
