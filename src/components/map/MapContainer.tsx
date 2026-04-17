'use client'

import { useEffect, useRef } from 'react'
import { api } from '@/trpc/client'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import {
  CARTO_DARK_MATTER,
  DEFAULT_ZOOM,
  ISOCHRONE_COLORS,
  LINE_META,
  TORONTO_CENTER,
} from '@/lib/constants'
import { useMapStore } from '@/lib/store'
import type { Station, TravelTime } from '@/server/types/station'

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

// Build a single-point GeoJSON for highlighting the selected station
function selectedStationGeoJSON(station: Station | null): GeoJSON.FeatureCollection<GeoJSON.Point> {
  if (!station) return { type: 'FeatureCollection', features: [] }
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [station.lng, station.lat] },
        properties: { id: station.id, name: station.name, lineId: station.lines[0] ?? '1' },
      },
    ],
  }
}

const TRAVEL_TIMES: readonly TravelTime[] = [60, 30, 15] as const // render order: largest first

export function MapContainer(): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const utils = api.useUtils()

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: CARTO_DARK_MATTER,
      center: [...TORONTO_CENTER],
      zoom: DEFAULT_ZOOM,
      attributionControl: false,
      minZoom: 9,
      maxZoom: 16,
      maxBounds: [
        [-80.5, 43.2],
        [-78.5, 44.2],
      ],
    })

    map.addControl(new maplibregl.NavigationControl(), 'top-right')
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right')

    map.on('load', async () => {
      map.addSource('isochrone-polygons', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })

      // Add fill + outline layers for each time bucket (largest -> smallest)
      for (const time of TRAVEL_TIMES) {
        const colors = ISOCHRONE_COLORS[time]

        map.addLayer({
          id: `iso-fill-${time}`,
          type: 'fill',
          source: 'isochrone-polygons',
          filter: ['==', ['get', 'contour'], time],
          paint: {
            'fill-color': colors.stroke,
            'fill-opacity': time === 15 ? 0.25 : time === 30 ? 0.2 : 0.15,
          },
        })

        map.addLayer({
          id: `iso-outline-${time}`,
          type: 'line',
          source: 'isochrone-polygons',
          filter: ['==', ['get', 'contour'], time],
          paint: {
            'line-color': colors.stroke,
            'line-width': 2,
          },
        })
      }

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

      // Selected Station Highlight
      map.addSource('selected-station', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })

      map.addLayer({
        id: 'selected-station-dot',
        type: 'circle',
        source: 'selected-station',
        paint: {
          'circle-radius': 9,
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
          'circle-stroke-width': 3,
          'circle-stroke-color': '#ffffff',
        },
      })

      // Click Handler
      map.on('click', 'station-dots', (e) => {
        const feature = e.features?.[0]
        if (!feature) return

        const clickedId = feature.properties?.id
        if (typeof clickedId !== 'string') return

        const station = useMapStore.getState().stations.find((s) => s.id === clickedId)
        if (!station) return

        useMapStore.getState().selectStation(station)
      })

      // Pointer cursor on hover
      map.on('mouseenter', 'station-dots', () => {
        map.getCanvas().style.cursor = 'pointer'
      })
      map.on('mouseleave', 'station-dots', () => {
        map.getCanvas().style.cursor = ''
      })

      // Subscribe: station hydration
      useMapStore.subscribe(
        (state) => state.stations,
        (stations) => {
          const src = map.getSource('all-stations')
          if (src && 'setData' in src) {
            ;(src as maplibregl.GeoJSONSource).setData(stationsToGeoJSON(stations))
          }
        }
      )

      // Subscribe: selected station -> flyTo + highlight + fetch isochrone
      useMapStore.subscribe(
        (state) => state.selectedStation,
        async (station) => {
          // Update highlight dot
          const highlightSrc = map.getSource('selected-station')
          if (highlightSrc && 'setData' in highlightSrc) {
            ;(highlightSrc as maplibregl.GeoJSONSource).setData(selectedStationGeoJSON(station))
          }

          if (!station) {
            // Clear isochrone when deselected
            const isoSrc = map.getSource('isochrone-polygons')
            if (isoSrc && 'setData' in isoSrc) {
              ;(isoSrc as maplibregl.GeoJSONSource).setData({
                type: 'FeatureCollection',
                features: [],
              })
            }
            return
          }

          // Fly to selected station
          map.flyTo({ center: [station.lng, station.lat], zoom: 13 })

          // Fetch isochrone from Valhalla via tRPC
          try {
            const geojson = await utils.isochrone.fetch(
              { stationId: station.id },
              { staleTime: 5 * 60_000 }
            )
            const isoSrc = map.getSource('isochrone-polygons')
            if (isoSrc && 'setData' in isoSrc) {
              ;(isoSrc as maplibregl.GeoJSONSource).setData(geojson as GeoJSON.FeatureCollection)
            }
          } catch (err) {
            console.error('Failed to fetch isochrone:', err)
          }
        }
      )

      // Subscribe: selectedTime -> isochrone layer visibility
      // Cumulative: selecting 30m shows 15m + 30m; selecting 60m shows all three
      useMapStore.subscribe(
        (state) => state.selectedTime,
        (time) => {
          for (const t of TRAVEL_TIMES) {
            const visible = t <= time
            map.setLayoutProperty(`iso-fill-${t}`, 'visibility', visible ? 'visible' : 'none')
            map.setLayoutProperty(`iso-outline-${t}`, 'visibility', visible ? 'visible' : 'none')
          }
        }
      )

      // Subscribe: enabledLines -> filter station dots + subway lines
      useMapStore.subscribe(
        (state) => state.enabledLines,
        (enabledLines) => {
          // Re-render station dots with only enabled-line stations
          const allStations = useMapStore.getState().stations
          const filtered = allStations.filter((s) => s.lines.some((l) => enabledLines.has(l)))
          const stationSrc = map.getSource('all-stations')
          if (stationSrc && 'setData' in stationSrc) {
            ;(stationSrc as maplibregl.GeoJSONSource).setData(stationsToGeoJSON(filtered))
          }

          // Filter subway line geometries by route_id
          const lineIds = [...enabledLines]
          map.setFilter('subway-lines-layer', ['in', ['get', 'route_id'], ['literal', lineIds]])
        }
      )

      // --- Bootstrap persisted state after map load ---
      const {
        selectedStation: persistedStation,
        selectedTime: persistedTime,
        enabledLines: persistedLines,
      } = useMapStore.getState()

      // Re-apply selectedTime layer visibility
      for (const t of TRAVEL_TIMES) {
        const visible = t <= persistedTime
        map.setLayoutProperty(`iso-fill-${t}`, 'visibility', visible ? 'visible' : 'none')
        map.setLayoutProperty(`iso-outline-${t}`, 'visibility', visible ? 'visible' : 'none')
      }

      // Re-apply enabledLines filter on station dots + subway lines
      const persistedLineIds = [...persistedLines]
      map.setFilter('subway-lines-layer', [
        'in',
        ['get', 'route_id'],
        ['literal', persistedLineIds],
      ])
      const filteredByLine = initialStations.filter((s) =>
        s.lines.some((l) => persistedLines.has(l))
      )
      const stationSrcInit = map.getSource('all-stations')
      if (stationSrcInit && 'setData' in stationSrcInit) {
        ;(stationSrcInit as maplibregl.GeoJSONSource).setData(stationsToGeoJSON(filteredByLine))
      }

      // Re-apply selected station highlight + isochrone
      if (persistedStation) {
        const highlightSrc = map.getSource('selected-station')
        if (highlightSrc && 'setData' in highlightSrc) {
          ;(highlightSrc as maplibregl.GeoJSONSource).setData(
            selectedStationGeoJSON(persistedStation)
          )
        }
        map.flyTo({ center: [persistedStation.lng, persistedStation.lat], zoom: 13 })
        try {
          const geojson = await utils.isochrone.fetch(
            { stationId: persistedStation.id },
            { staleTime: 5 * 60_000 }
          )
          const isoSrc = map.getSource('isochrone-polygons')
          if (isoSrc && 'setData' in isoSrc) {
            ;(isoSrc as maplibregl.GeoJSONSource).setData(geojson as GeoJSON.FeatureCollection)
          }
        } catch (err) {
          console.error('Failed to restore isochrone:', err)
        }
      }
    })

    mapRef.current = map

    return (): void => {
      map.remove()
      mapRef.current = null
    }
  }, [utils.isochrone])

  return <div ref={containerRef} className="h-full w-full" />
}
