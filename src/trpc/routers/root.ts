import { z } from 'zod'
import { publicProcedure, router } from '../setup'
import { db } from '@/lib/db'

export const appRouter = router({
  healthcheck: publicProcedure.query(async () => {
    try {
      await db.query('SELECT 1')
      return { status: 'ok', db: 'connected' } as const
    } catch {
      return { status: 'ok', db: 'disconnected' } as const
    }
  }),
  greeting: publicProcedure
    .input(z.object({ name: z.string().optional() }).optional())
    .query(({ input }) => {
      return {
        greeting: `Hello ${input?.name ?? 'World'}`,
      }
    }),
  // Temporary live mockup endpoint to bypass database and hit Valhalla directly for UI preview
  isochronePreview: publicProcedure
    .input(z.object({ lat: z.number(), lon: z.number() }))
    .query(async ({ input }) => {
      try {
        const payload = {
          locations: [{ lat: input.lat, lon: input.lon }],
          costing: 'transit',
          contours: [
            { time: 15, color: '00FF00' },
            { time: 30, color: 'FFFF00' },
            { time: 60, color: 'FF0000' },
          ],
          polygons: true,
          date_time: {
            type: 1,
            value: new Date().toISOString().slice(0, 16), // e.g. "2026-04-14T08:00"
          },
        }

        const res = await fetch('http://localhost:8002/isochrone', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        if (!res.ok) {
          throw new Error(`Valhalla Engine Error: ${res.statusText}`)
        }

        // Valhalla natively returns GeoJSON FeatureCollection
        return (await res.json()) as unknown
      } catch (err) {
        console.error('Valhalla fetch failed:', err)
        throw new Error(
          'Failed to fetch isochrone from local Valhalla engine. Is it still building the graph?'
        )
      }
    }),
})

export type AppRouter = typeof appRouter
