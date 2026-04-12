'use client'

import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { CARTO_DARK_MATTER, DEFAULT_ZOOM, LINE_COLORS, TORONTO_CENTER } from '@/lib/constants'

// Hardcoded preview station — removed once Slice 2 seeds real data
const BLOOR_YONGE: [number, number] = [-79.386, 43.6709] // [lng, lat]

export function MapContainer(): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: CARTO_DARK_MATTER,
      center: [...TORONTO_CENTER], // spread so MapLibre gets a mutable tuple
      zoom: DEFAULT_ZOOM,
      attributionControl: false,
    })

    // Dark-themed navigation controls (styled in globals.css)
    map.addControl(new maplibregl.NavigationControl(), 'top-right')
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right')

    map.on('load', () => {
      // One hardcoded station dot — proves the layer pipeline works
      map.addSource('station-preview', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: BLOOR_YONGE },
          properties: { name: 'Bloor–Yonge', lineId: 'line-1' },
        },
      })

      map.addLayer({
        id: 'station-dot',
        type: 'circle',
        source: 'station-preview',
        paint: {
          'circle-radius': 7,
          'circle-color': LINE_COLORS['line-1'], // '#FFD700' — Line 1 yellow
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      })
    })

    mapRef.current = map

    // Cleanup: detach WebGL context + DOM listeners on unmount / HMR cycle
    return (): void => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  return <div ref={containerRef} className="h-full w-full" />
}
