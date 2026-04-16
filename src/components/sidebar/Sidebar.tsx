'use client'

import { SelectedStationCard } from './SelectedStationCard'
import { TravelTimeToggle } from './TravelTimeToggle'
import { LineFilter } from './LineFilter'
import { StationList } from './StationList'

export function Sidebar(): React.ReactElement {
  return (
    <aside className="flex shrink-0 flex-row items-center gap-3 border-t border-white/10 bg-zinc-950 px-4 py-3 md:w-80 md:flex-col md:items-stretch md:gap-4 md:overflow-hidden md:border-t-0 md:border-r md:p-6">
      {/* Title — subtitle hidden on mobile to keep bar slim */}
      <div className="min-w-0 shrink md:shrink-0">
        <h1 className="truncate text-sm font-semibold tracking-tight text-white md:text-lg">
          Toronto Isochrone
        </h1>
        <p className="mt-1 hidden text-xs text-zinc-500 md:block">
          Transit reachability from every TTC subway station.
        </p>
      </div>

      {/* Selected station card */}
      <div className="min-w-0 flex-1 md:flex-none">
        <SelectedStationCard />
      </div>

      {/* Travel time toggle — visible on both layouts */}
      <TravelTimeToggle />

      {/* Line filter — desktop only */}
      <LineFilter />

      {/* Station list with search — desktop only, scrollable */}
      <StationList />
    </aside>
  )
}
