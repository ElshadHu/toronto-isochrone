'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SelectedStationCard } from './SelectedStationCard'
import { TravelTimeToggle } from './TravelTimeToggle'
import { LineFilter } from './LineFilter'
import { StationList } from './StationList'
import { MobileSearchSheet } from './MobileSearchSheet'

export function Sidebar(): React.ReactElement {
  const [isOpen, setIsOpen] = useState(true)
  const [searchOpen, setSearchOpen] = useState(false)

  return (
    <>
      <div className="absolute top-0 left-0 z-20 hidden h-full md:flex">
        <div
          className={[
            'h-full overflow-hidden',
            'transition-[width] duration-300 ease-in-out',
            isOpen ? 'w-64' : 'w-0',
          ].join(' ')}
        >
          <aside className="flex h-full w-64 flex-col gap-3 overflow-y-auto border-r border-white/10 bg-zinc-950/95 px-4 py-4 shadow-xl backdrop-blur-sm">
            <div className="min-w-0">
              <h1 className="text-sm font-semibold tracking-tight text-white">Toronto Isochrone</h1>
              <p className="mt-0.5 text-[11px] text-zinc-500">
                Transit reachability from every TTC subway station.
              </p>
            </div>

            <SelectedStationCard />
            <TravelTimeToggle />
            <LineFilter />
            <StationList />
          </aside>
        </div>
        <button
          onClick={() => setIsOpen((v) => !v)}
          aria-label={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          className={[
            'flex h-10 w-6 shrink-0 items-center justify-center self-center',
            'rounded-r-md border border-l-0 border-white/10 bg-zinc-900',
            'text-zinc-500 shadow-md',
            'transition-colors hover:bg-zinc-800 hover:text-zinc-200',
          ].join(' ')}
        >
          {isOpen ? <ChevronLeft className="size-3" /> : <ChevronRight className="size-3" />}
        </button>
      </div>
      <div
        className={[
          'absolute bottom-0 left-0 z-20 flex w-full flex-col md:hidden',
          'transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-y-0' : 'translate-y-[calc(100%-3rem)]',
        ].join(' ')}
      >
        <button
          onClick={() => setIsOpen((v) => !v)}
          aria-label={isOpen ? 'Collapse panel' : 'Expand panel'}
          className={[
            'flex h-12 w-full items-center justify-center gap-2',
            'rounded-t-2xl border-t border-white/10 bg-zinc-950/95 backdrop-blur-sm',
            'text-zinc-400 shadow-[0_-4px_24px_rgba(0,0,0,0.5)]',
            'transition-colors active:bg-zinc-800',
          ].join(' ')}
        >
          <span className="h-1 w-10 rounded-full bg-zinc-600" />
          {isOpen ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
        </button>

        <aside
          className="flex flex-col gap-3 overflow-y-auto border-t border-white/5 bg-zinc-950/95 px-4 pt-3 pb-6 shadow-2xl backdrop-blur-sm"
          style={{ maxHeight: '60dvh' }}
        >
          <div className="min-w-0">
            <h1 className="text-sm font-semibold tracking-tight text-white">Toronto Isochrone</h1>
            <p className="mt-0.5 text-xs text-zinc-400">
              Transit reachability from every TTC subway station.
            </p>
          </div>

          <SelectedStationCard />

          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-xs"
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
      </div>

      <MobileSearchSheet open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  )
}
