'use client'

import { useMemo, useState, useRef, useCallback, useEffect } from 'react'
/* useEffect is kept only for scroll-into-view (external DOM sync) */
import Fuse from 'fuse.js'
import { Search } from 'lucide-react'
import { useMapStore } from '@/lib/store'
import { LINE_META } from '@/lib/constants'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { Station } from '@/server/types/station'

type MatchIndices = readonly [number, number][]

function HighlightedName({ name, indices }: { name: string; indices: MatchIndices | undefined }) {
  if (!indices || indices.length === 0) {
    return <>{name}</>
  }

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

export function StationList(): React.ReactElement {
  const stations = useMapStore((s) => s.stations)
  const enabledLines = useMapStore((s) => s.enabledLines)
  const selectedStation = useMapStore((s) => s.selectedStation)
  const selectStation = useMapStore((s) => s.selectStation)

  const [query, setQuery] = useState('')
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

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

  // Clamp focusedIndex so stale values don't survive a line-filter change
  const clampedFocus = Math.min(focusedIndex, visibleStations.length - 1)

  // Scroll focused item into view
  useEffect(() => {
    if (clampedFocus < 0) return
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${clampedFocus}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [clampedFocus])

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
          setQuery('')
          setFocusedIndex(-1)
          inputRef.current?.blur()
        }
      } else if (e.key === 'Escape') {
        setQuery('')
        setFocusedIndex(-1)
        inputRef.current?.blur()
      }
    },
    [clampedFocus, visibleStations, selectStation]
  )

  return (
    <div className="hidden min-h-0 flex-1 md:flex md:flex-col">
      <p className="mb-2 text-[11px] font-medium tracking-wide text-zinc-500 uppercase">Stations</p>

      {/* Search input */}
      <div className="relative mb-2">
        <Search className="absolute top-1/2 left-2.5 size-3 -translate-y-1/2 text-zinc-500" />
        <Input
          ref={inputRef}
          className="pl-7"
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

      {/* Station list */}
      <ScrollArea className="flex-1 rounded-lg border border-white/5 bg-zinc-900 p-1">
        <div ref={listRef} className="flex flex-col gap-0.5">
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
                  className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left transition-colors ${
                    isSelected
                      ? 'bg-white/10 text-white'
                      : idx === clampedFocus
                        ? 'bg-white/8 text-zinc-200 ring-1 ring-white/20 outline-none'
                        : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
                  }`}
                  onClick={() => selectStation(station)}
                >
                  <span className="min-w-0 flex-1 truncate text-xs font-medium">
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
      </ScrollArea>
    </div>
  )
}
