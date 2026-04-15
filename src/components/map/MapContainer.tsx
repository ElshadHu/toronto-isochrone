'use client'

import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { CARTO_DARK_MATTER, DEFAULT_ZOOM, LINE_META, TORONTO_CENTER } from '@/lib/constants'

import { api } from '@/trpc/client'

// Hardcoded preview station — Bloor-Yonge
const BLOOR_YONGE: [number, number] = [-79.386, 43.6709] // [lng, lat]

export function MapContainer(): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)

  // 1. Fetch live Valhalla preview from tRPC!
  const isochroneQuery = api.isochronePreview.useQuery(
    { lat: BLOOR_YONGE[1], lon: BLOOR_YONGE[0] }, // Pass exact coordinates
    { refetchOnWindowFocus: false, retry: false }
  )

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

    map.on('load', () => {
      // 2. Wait until Map is loaded to ensure layer injection succeeds
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
          'circle-color': LINE_META['1'].color,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      })
    })

    mapRef.current = map

    return (): void => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  // 3. Effect loop to paint the Valhalla Polygons when they finish loading over tRPC
  useEffect(() => {
    const map = mapRef.current
    if (!map || isochroneQuery.isLoading || !isochroneQuery.data) return

    // Clean up old source if hot-reloading
    if (map.getSource('valhalla-isochrone')) {
      ;(map.getSource('valhalla-isochrone') as maplibregl.GeoJSONSource).setData(
        isochroneQuery.data as any
      )
      return
    }

    map.addSource('valhalla-isochrone', {
      type: 'geojson',
      // The API perfectly returns GeoJSON!
      data: isochroneQuery.data as any,
    })

    // Draw the polygons (15/30/60 bounds) with opacity
    map.addLayer(
      {
        id: 'valhalla-iso-layer',
        type: 'fill',
        source: 'valhalla-isochrone',
        layout: {},
        paint: {
          // Valhalla natively injects contour colors into the GeoJSON properties!
          'fill-color': ['concat', '#', ['get', 'color']],
          'fill-opacity': 0.3,
        },
        // Insert polygon BELOW the station dot so it doesn't cover it
      },
      'station-dot'
    )

    // Optional: add a clean border outline to the polygons
    map.addLayer(
      {
        id: 'valhalla-iso-outline',
        type: 'line',
        source: 'valhalla-isochrone',
        layout: {},
        paint: {
          'line-color': ['concat', '#', ['get', 'color']],
          'line-width': 2,
        },
      },
      'station-dot'
    )
  }, [isochroneQuery.data, isochroneQuery.isLoading])

  return <div ref={containerRef} className="h-full w-full" />
}
