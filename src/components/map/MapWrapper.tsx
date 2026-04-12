'use client'

import dynamic from 'next/dynamic'

// MapLibre needs window + WebGL which  must be dynamically loaded, client-only
const MapContainer = dynamic(
  () => import('@/components/map/MapContainer').then((m) => m.MapContainer),
  {
    ssr: false,
    loading: () => <div className="h-full w-full bg-zinc-950" />,
  }
)

export function MapWrapper(): React.ReactElement {
  return (
    <div className="h-full w-full">
      <MapContainer />
    </div>
  )
}
