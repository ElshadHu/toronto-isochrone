'use client'

import { useEffect } from 'react'
import { useMapStore } from '@/lib/store'
import type { Station } from '@/server/types/station'

//  Side-effect component which fetches pipeline-validated stations.json on mount
//  and hydrates the Zustand store
export function StationLoader(): null {
  useEffect(() => {
    const load = async (): Promise<void> => {
      const res = await fetch('/data/stations.json')
      const stations: Station[] = await res.json()
      useMapStore.getState().setStations(stations)
    }
    void load()
  }, [])

  return null
}
