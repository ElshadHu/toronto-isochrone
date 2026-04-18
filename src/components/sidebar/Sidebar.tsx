'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SelectedStationCard } from './SelectedStationCard'
import { TravelTimeToggle } from './TravelTimeToggle'
import { LineFilter } from './LineFilter'
import { StationList } from './StationList'
import { MobileSearchSheet } from './MobileSearchSheet'

export function Sidebar(): React.ReactElement {
  const [searchOpen, setSearchOpen] = useState(false)

  return (
    <>
      <aside className="flex shrink-0 flex-col items-stretch gap-4 overflow-y-auto border-t border-white/10 bg-zinc-950 px-4 py-4 md:w-80 md:overflow-hidden md:border-t-0 md:border-r md:p-6">
        <div className="min-w-0">
          <h1 className="text-sm font-semibold tracking-tight text-white md:text-lg">
            Toronto Isochrone
          </h1>
          <p className="mt-1 text-xs text-zinc-400">
            Transit reachability from every TTC subway station.
          </p>
        </div>

        <SelectedStationCard />

        <Button
          variant="outline"
          size="sm"
          className="gap-2 text-xs md:hidden"
          onClick={() => setSearchOpen(true)}
          aria-label="Search stations"
        >
          <Search className="size-3.5" />
          Search stations
        </Button>

        <TravelTimeToggle />
        <LineFilter />
        <StationList />
      </aside>

      <MobileSearchSheet open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  )
}
