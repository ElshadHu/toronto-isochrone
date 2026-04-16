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
  // Fetch walking isochrone from Valhalla for a given station coordinate
  isochrone: publicProcedure
    .input(z.object({ lat: z.number(), lon: z.number() }))
    .query(async ({ input }) => {
      try {
        const payload = {
          locations: [{ lat: input.lat, lon: input.lon }],
          costing: 'pedestrian',
          contours: [{ time: 15 }, { time: 30 }, { time: 60 }],
          polygons: true,
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
