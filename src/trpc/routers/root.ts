import { z } from 'zod'
import { publicProcedure, router } from '../setup'
import { db } from '@/lib/db'
import type { RowDataPacket } from 'mysql2'
import type { LineId, Station } from '@/server/types/station'

type StationRow = RowDataPacket & {
  id: string
  name: string
  lat: number
  lng: number
  line_ids: string
}

type IsochroneRow = RowDataPacket & {
  geojson: string
}

export const appRouter = router({
  healthcheck: publicProcedure.query(async () => {
    try {
      await db.query('SELECT 1')
      return { status: 'ok', db: 'connected' } as const
    } catch {
      return { status: 'ok', db: 'disconnected' } as const
    }
  }),
  getStations: publicProcedure.query(async (): Promise<Station[]> => {
    const [rows] = await db.query<StationRow[]>(
      `SELECT s.id, s.name, s.lat, s.lng,
              GROUP_CONCAT(sl.line_id ORDER BY sl.line_id) AS line_ids
       FROM stations s
       LEFT JOIN station_lines sl ON s.id = sl.station_id
       GROUP BY s.id
       ORDER BY s.name`
    )
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      lat: row.lat,
      lng: row.lng,
      lines: (row.line_ids?.split(',') ?? []) as LineId[],
    }))
  }),

  isochrone: publicProcedure.input(z.object({ stationId: z.string() })).query(async ({ input }) => {
    // Try DB first — single row per station, full FeatureCollection
    const [rows] = await db.query<IsochroneRow[]>(
      'SELECT geojson FROM isochrones WHERE station_id = ?',
      [input.stationId]
    )

    const row = rows[0]
    if (row) {
      return JSON.parse(row.geojson) as unknown
    }

    // Fallback: live Valhalla call using station coords from DB
    const [stationRows] = await db.query<(RowDataPacket & { lat: number; lng: number })[]>(
      'SELECT lat, lng FROM stations WHERE id = ?',
      [input.stationId]
    )

    const station = stationRows[0]
    if (!station) throw new Error(`Station not found: ${input.stationId}`)

    const payload = {
      locations: [{ lat: station.lat, lon: station.lng }],
      costing: 'pedestrian',
      contours: [{ time: 15 }, { time: 30 }, { time: 60 }],
      polygons: true,
    }

    const headers = new Headers()
    headers.set('Content-Type', 'application/json')

    const res = await fetch('http://localhost:8002/isochrone', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      throw new Error(`Valhalla Engine Error: ${res.statusText}`)
    }

    return (await res.json()) as unknown
  }),
})

export type AppRouter = typeof appRouter
