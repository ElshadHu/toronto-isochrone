import { z } from 'zod'
import { publicProcedure, router } from './trpc'

export const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok' } as const
  }),
  greeting: publicProcedure
    .input(z.object({ name: z.string().optional() }).optional())
    .query(({ input }) => {
      return {
        greeting: `Hello ${input?.name ?? 'World'}`,
      }
    }),
})

export type AppRouter = typeof appRouter
