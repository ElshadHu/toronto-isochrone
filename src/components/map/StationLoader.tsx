'use client'

import { useEffect } from 'react'
import { useMapStore } from '@/lib/store'
import { api } from '@/trpc/client'

export function StationLoader(): null {
  const { data } = api.getStations.useQuery(undefined, {
    staleTime: Infinity, // stations never change at runtime
  })
  useEffect(() => {
    if (data) {
      useMapStore.getState().setStations(data)
    }
  }, [data])
  return null
}
