import { parse } from 'csv-parse'
import { stringify } from 'csv-stringify'
import { createReadStream, createWriteStream, existsSync, mkdirSync } from 'node:fs'
import { pipeline } from 'node:stream/promises'
import * as path from 'node:path'
import { z } from 'zod'

const DATA_DIR = path.resolve(process.cwd(), 'valhalla_data')
const RAW_DIR = path.join(DATA_DIR, 'raw_gtfs')
const FILTERED_DIR = path.join(DATA_DIR, 'gtfs_feeds', 'ttc')

const MAPPED_ROUTES_PATH = path.join(FILTERED_DIR, 'routes.txt')
const RAW_ROUTES_PATH = path.join(RAW_DIR, 'routes.txt')

// Strict validation of the inbound routes CSV rows
const GtfsRouteSchema = z
  .object({
    route_id: z.string(),
    route_short_name: z.string().optional(),
    route_long_name: z.string().optional(),
    route_type: z.string(),
    // Add passthrough so we preserve any other standard GTFS columns
  })
  .passthrough()

export async function filterSubwayLines(): Promise<void> {
  if (!existsSync(RAW_ROUTES_PATH)) {
    throw new Error(`Raw routes file missing at: ${RAW_ROUTES_PATH}\nRun fetch-gtfs.ts first.`)
  }

  if (!existsSync(FILTERED_DIR)) {
    mkdirSync(FILTERED_DIR, { recursive: true })
  }

  console.log('Parsing raw GTFS routes.txt to extract the Toronto Subway lines...')

  const readStream = createReadStream(RAW_ROUTES_PATH)
  const writeStream = createWriteStream(MAPPED_ROUTES_PATH)

  const parser = parse({
    columns: true, // Output rows as JS objects matched by header
    skip_empty_lines: true,
    trim: true,
  })

  const stringifier = stringify({ header: true })

  // Exact route IDs
  const allowedRouteIds = new Set(['1', '2', '4', '5', '6'])

  const streamProcessing = async (): Promise<void> => {
    for await (const row of readStream.pipe(parser)) {
      const parsed = GtfsRouteSchema.safeParse(row)

      if (parsed.success && allowedRouteIds.has(parsed.data.route_id)) {
        stringifier.write(parsed.data)
      }
    }
    stringifier.end()
  }

  // Run the aggregation pipeline
  await Promise.all([streamProcessing(), pipeline(stringifier, writeStream)])

  console.log(`Subway filtering complete. Modified file active at: ${MAPPED_ROUTES_PATH}`)
}

// Execute if run directly
if (require.main === module) {
  filterSubwayLines().catch((err: unknown) => {
    console.error('Filter Pipeline crashed:')
    if (err instanceof Error) {
      console.error(err.message)
    } else {
      console.error(err)
    }
    process.exit(1)
  })
}
