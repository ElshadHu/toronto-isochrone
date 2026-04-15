import { create } from 'zustand'
import type { LineId, Station, TravelTime } from '@/server/types/station'

const ALL_LINE_IDS: readonly LineId[] = ['1', '2', '4']

type MapState = {
  stations: Station[]
  selectedStation: Station | null
  selectedTime: TravelTime
  enabledLines: Set<LineId>

  setStations: (stations: Station[]) => void
  selectStation: (station: Station | null) => void
  setSelectedTime: (time: TravelTime) => void
  toggleLine: (line: LineId) => void
}

export const useMapStore = create<MapState>((set) => ({
  stations: [],
  selectedStation: null,
  selectedTime: 15,
  enabledLines: new Set(ALL_LINE_IDS),

  setStations: (stations) => set({ stations }),

  // Spread to force a new reference — ensures map effects re-run
  // even when the same station is re-selected
  selectStation: (station) => set({ selectedStation: station !== null ? { ...station } : null }),

  setSelectedTime: (time) => set({ selectedTime: time }),

  toggleLine: (line) =>
    set((state) => {
      const next = new Set(state.enabledLines)
      if (next.has(line)) {
        next.delete(line)
      } else {
        next.add(line)
      }
      return { enabledLines: next }
    }),
}))
