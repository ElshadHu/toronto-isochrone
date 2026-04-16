'use client'

import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { CARTO_DARK_MATTER, DEFAULT_ZOOM, LINE_META, TORONTO_CENTER } from '@/lib/constants'
import { useMapStore } from '@/lib/store'
import type { Station } from '@/server/types/station'

// Convert Station[] into a GeoJSON FeatureCollection of Points
function stationsToGeoJSON(stations: readonly Station[]): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: 'FeatureCollection',
    features: stations.map((s) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [s.lng, s.lat] },
      properties: { id: s.id, name: s.name, lineId: s.lines[0] ?? '1' },
    })),
  }
}

export function MapContainer(): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: CARTO_DARK_MATTER,
      center: [...TORONTO_CENTER],
      zoom: DEFAULT_ZOOM,
      attributionControl: false,
    })

    map.addControl(new maplibregl.NavigationControl(), 'top-right')
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right')

    map.on('load', async () => {
      // Subway Lines (static GeoJSON)
      const linesRes = await fetch('/data/lines.geojson')
      const linesData = (await linesRes.json()) as GeoJSON.FeatureCollection

      map.addSource('subway-lines', { type: 'geojson', data: linesData })

      map.addLayer({
        id: 'subway-lines-layer',
        type: 'line',
        source: 'subway-lines',
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 3,
          'line-opacity': 0.8,
        },
      })

      // Station Dots (from Zustand store)
      const initialStations = useMapStore.getState().stations

      map.addSource('all-stations', {
        type: 'geojson',
        data: stationsToGeoJSON(initialStations),
      })

      map.addLayer({
        id: 'station-dots',
        type: 'circle',
        source: 'all-stations',
        paint: {
          'circle-radius': 5,
          'circle-color': [
            'match',
            ['get', 'lineId'],
            '1',
            LINE_META['1'].color,
            '2',
            LINE_META['2'].color,
            '4',
            LINE_META['4'].color,
            '#888888',
          ],
          'circle-stroke-width': 1,
          'circle-stroke-color': '#ffffff',
        },
      })

      // Re-paint station dots when StationLoader hydrates the store
      useMapStore.subscribe(
        (state) => state.stations,
        (stations) => {
          const src = map.getSource('all-stations')
          if (src && 'setData' in src) {
            ;(src as maplibregl.GeoJSONSource).setData(stationsToGeoJSON(stations))
          }
        }
      )
    })

    mapRef.current = map

    return (): void => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  return <div ref={containerRef} className="h-full w-full" />
}
