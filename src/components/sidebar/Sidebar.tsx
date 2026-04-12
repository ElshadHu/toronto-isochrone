'use client'

export function Sidebar(): React.ReactElement {
  return (
    <aside className="flex shrink-0 flex-row items-center gap-3 border-t border-white/10 bg-zinc-950 px-4 py-3 md:w-80 md:flex-col md:items-stretch md:gap-4 md:border-t-0 md:border-r md:p-6">
      {/* Title — subtitle hidden on mobile to keep bar slim */}
      <div className="min-w-0 shrink">
        <h1 className="truncate text-sm font-semibold tracking-tight text-white md:text-lg">
          Toronto Isochrone
        </h1>
        <p className="mt-1 hidden text-xs text-zinc-500 md:block">
          Transit reachability from every TTC subway station.
        </p>
      </div>

      {/* Travel time toggle — horizontal row on both layouts */}
      <div className="flex shrink-0 gap-2">
        {([15, 30, 60] as const).map((t) => (
          <button
            key={t}
            disabled
            className="rounded-md border border-white/10 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-500"
          >
            {t}m
          </button>
        ))}
      </div>

      {/* Station list — desktop only */}
      <div className="hidden flex-1 rounded-lg border border-white/5 bg-zinc-900 p-4 md:flex md:flex-col">
        <p className="text-xs text-zinc-600">Station list — coming in Slice 5</p>
      </div>
    </aside>
  )
}
