import { create } from 'zustand'
import { subscribeWithSelector, persist, createJSONStorage } from 'zustand/middleware'
import { LINE_META } from '@/lib/constants'
import type { LineId, Station, TravelTime } from '@/server/types/station'

const ALL_LINE_IDS = Object.keys(LINE_META) as LineId[]

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

export const useMapStore = create<MapState>()(
  subscribeWithSelector(
    persist(
      (set) => ({
        stations: [],
        selectedStation: null,
        selectedTime: 15,
        enabledLines: new Set(ALL_LINE_IDS),

        setStations: (stations) => set({ stations }),

        selectStation: (station) =>
          set({ selectedStation: station !== null ? { ...station } : null }),

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
      }),
      {
        name: 'toronto-isochrone',
        storage: createJSONStorage(() => localStorage),
        // Don't persist the full stations list if  it's loaded from the server on mount
        partialize: (state) => ({
          selectedStation: state.selectedStation,
          selectedTime: state.selectedTime,
          enabledLines: [...state.enabledLines], // serialize Set  to  array
        }),
        merge: (persisted: unknown, current) => {
          const p = persisted as {
            selectedStation?: Station | null
            selectedTime?: TravelTime
            enabledLines?: LineId[]
          }
          return {
            ...current,
            selectedStation: p.selectedStation ?? null,
            selectedTime: p.selectedTime ?? 15,
            enabledLines: new Set(p.enabledLines ?? ALL_LINE_IDS),
          }
        },
      }
    )
  )
)
