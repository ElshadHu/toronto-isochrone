'use client'

import { X } from 'lucide-react'
import { useMapStore } from '@/lib/store'
import { LINE_META } from '@/lib/constants'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export function SelectedStationCard(): React.ReactElement {
  const selectedStation = useMapStore((s) => s.selectedStation)
  const selectStation = useMapStore((s) => s.selectStation)

  if (!selectedStation) {
    return (
      <div className="rounded-lg border border-white/5 bg-zinc-900 px-3 py-2 md:px-4 md:py-3">
        <p className="text-xs text-zinc-500">
          <span className="md:hidden">Tap a station.</span>
          <span className="hidden md:inline">Select a subway station on the map.</span>
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 md:px-4 md:py-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{selectedStation.name}</p>
          <div className="mt-1.5 hidden flex-wrap gap-1 md:flex">
            {selectedStation.lines.map((lineId) => {
              const meta = LINE_META[lineId]
              return (
                <Badge
                  key={lineId}
                  className="text-[10px] text-white"
                  style={{ backgroundColor: meta.color }}
                >
                  {meta.name}
                </Badge>
              )
            })}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          className="shrink-0 text-zinc-400 hover:text-white"
          onClick={() => selectStation(null)}
          aria-label="Deselect station"
        >
          <X className="size-4" />
        </Button>
      </div>
    </div>
  )
}
