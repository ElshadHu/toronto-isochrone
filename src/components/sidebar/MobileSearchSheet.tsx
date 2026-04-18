'use client'

import { useMemo, useState, useRef, useCallback, useEffect } from 'react'
import Fuse from 'fuse.js'
import { Search, X } from 'lucide-react'
import { useMapStore } from '@/lib/store'
import { LINE_META } from '@/lib/constants'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { Station } from '@/server/types/station'

type MatchIndices = readonly [number, number][]

function HighlightedName({ name, indices }: { name: string; indices: MatchIndices | undefined }) {
  if (!indices || indices.length === 0) return <>{name}</>
  const parts: React.ReactNode[] = []
  let cursor = 0
  for (const [start, end] of indices) {
    if (start > cursor) parts.push(name.slice(cursor, start))
    parts.push(
      <mark key={start} className="bg-transparent font-semibold text-white">
        {name.slice(start, end + 1)}
      </mark>
    )
    cursor = end + 1
  }
  if (cursor < name.length) parts.push(name.slice(cursor))
  return <>{parts}</>
}

interface Props {
  open: boolean
  onClose: () => void
}

export function MobileSearchSheet({ open, onClose }: Props): React.ReactElement {
  const stations = useMapStore((s) => s.stations)
  const enabledLines = useMapStore((s) => s.enabledLines)
  const selectedStation = useMapStore((s) => s.selectedStation)
  const selectStation = useMapStore((s) => s.selectStation)

  const [query, setQuery] = useState('')
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150)
  }, [open])

  const handleClose = useCallback(() => {
    setQuery('')
    setFocusedIndex(-1)
    onClose()
  }, [onClose])

  const fuse = useMemo(
    () =>
      new Fuse(stations, {
        keys: ['name'],
        threshold: 0.35,
        includeMatches: true,
      }),
    [stations]
  )

  type StationWithMatch = { station: Station; indices?: MatchIndices }

  const visibleStations = useMemo((): StationWithMatch[] => {
    const lineFiltered = (s: Station) => s.lines.some((l) => enabledLines.has(l))

    if (!query.trim()) {
      return stations
        .filter(lineFiltered)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((station) => ({ station }))
    }

    return fuse
      .search(query)
      .filter((r) => lineFiltered(r.item))
      .map((r) => ({
        station: r.item,
        indices: r.matches?.[0]?.indices as MatchIndices | undefined,
      }))
  }, [stations, enabledLines, query, fuse])

  const clampedFocus = Math.min(focusedIndex, visibleStations.length - 1)

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setFocusedIndex((i) => Math.min(i + 1, visibleStations.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setFocusedIndex((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Enter') {
        if (clampedFocus >= 0 && visibleStations[clampedFocus]) {
          selectStation(visibleStations[clampedFocus].station)
          handleClose()
        }
      } else if (e.key === 'Escape') {
        handleClose()
      }
    },
    [clampedFocus, visibleStations, selectStation, handleClose]
  )

  const handleSelect = useCallback(
    (station: Station) => {
      selectStation(station)
      handleClose()
    },
    [selectStation, handleClose]
  )

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 md:hidden ${
          open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search stations"
        className={`fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-2xl border-t border-white/10 bg-zinc-950 transition-transform duration-300 ease-out md:hidden ${
          open ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ maxHeight: '80dvh' }}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-zinc-700" />
        </div>

        <div className="flex items-center gap-3 px-4 py-3">
          <p className="flex-1 text-sm font-semibold text-white">Stations</p>
          <Button
            variant="ghost"
            size="icon-sm"
            className="shrink-0 text-zinc-400 hover:text-white"
            onClick={handleClose}
            aria-label="Close search"
          >
            <X className="size-4" />
          </Button>
        </div>

        <div className="relative px-4 pb-3">
          <Search className="absolute top-1/2 left-7 size-3.5 -translate-y-1/2 text-zinc-500" />
          <Input
            ref={inputRef}
            className="pl-8"
            placeholder="Search station…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setFocusedIndex(-1)
            }}
            onKeyDown={handleKeyDown}
            aria-label="Search stations"
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
          <div className="flex flex-col gap-0.5 rounded-lg border border-white/5 bg-zinc-900 p-1">
            {visibleStations.length === 0 ? (
              <p className="px-2.5 py-4 text-center text-xs text-zinc-500">No stations found.</p>
            ) : (
              visibleStations.map(({ station, indices }, idx) => {
                const isSelected = selectedStation?.id === station.id
                return (
                  <button
                    key={station.id}
                    type="button"
                    data-index={idx}
                    className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2.5 text-left transition-colors ${
                      isSelected
                        ? 'bg-white/10 text-white'
                        : idx === clampedFocus
                          ? 'bg-white/8 text-zinc-200 ring-1 ring-white/20 outline-none'
                          : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
                    }`}
                    onClick={() => handleSelect(station)}
                  >
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      <HighlightedName name={station.name} indices={indices} />
                    </span>
                    <div className="flex shrink-0 gap-1">
                      {station.lines.map((lineId) => {
                        const meta = LINE_META[lineId]
                        return (
                          <Badge
                            key={lineId}
                            className="h-4 px-1 text-[9px] text-white"
                            style={{ backgroundColor: meta.color }}
                          >
                            L{lineId}
                          </Badge>
                        )
                      })}
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>
      </div>
    </>
  )
}
