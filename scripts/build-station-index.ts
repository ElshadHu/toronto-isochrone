import { parse } from 'csv-parse'
import { createReadStream, promises as fs } from 'node:fs'
import * as path from 'node:path'
import { z } from 'zod'

const FILTERED_DIR = path.resolve(process.cwd(), 'valhalla_data', 'gtfs_feeds', 'ttc')
const PUBLIC_DATA_DIR = path.resolve(process.cwd(), 'public', 'data')

//Zod schemas for GTFS CSV rows

const TripRowSchema = z.object({ trip_id: z.string(), route_id: z.string() }).passthrough()

const StopTimeRowSchema = z.object({ trip_id: z.string(), stop_id: z.string() }).passthrough()

const StationFeatureSchema = z.object({
  type: z.literal('Feature'),
  properties: z.object({ stop_id: z.string(), name: z.string() }),
  geometry: z.object({
    type: z.literal('Point'),
    coordinates: z.tuple([z.number(), z.number()]),
  }),
})

const FeatureCollectionSchema = z.object({
  type: z.literal('FeatureCollection'),
  features: z.array(StationFeatureSchema),
})

// Output type

type StationEntry = {
  readonly id: string
  readonly name: string
  readonly lat: number
  readonly lng: number
  readonly lines: readonly string[]
}

// Helpers

// "Finch Station - Southbound Platform" -> "Finch Station"
function toBaseName(name: string): string {
  const idx = name.indexOf(' - ')
  return idx === -1 ? name : name.slice(0, idx)
}

// "Finch Station" -> "finch"
function toSlugId(baseName: string): string {
  return baseName
    .toLowerCase()
    .replace(/\bstation\b/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function getOrSet<K, V>(map: Map<K, V>, key: K, factory: () => V): V {
  const existing = map.get(key)
  if (existing !== undefined) return existing
  const created = factory()
  map.set(key, created)
  return created
}

// Pipeline steps

async function buildTripToRouteMap(): Promise<Map<string, string>> {
  console.log('1. Building trip → route map from trips.txt...')
  const tripToRoute = new Map<string, string>()
  const stream = createReadStream(path.join(FILTERED_DIR, 'trips.txt')).pipe(
    parse({ columns: true, skip_empty_lines: true })
  )
  for await (const row of stream) {
    const parsed = TripRowSchema.safeParse(row)
    if (parsed.success) tripToRoute.set(parsed.data.trip_id, parsed.data.route_id)
  }
  console.log(`   ${tripToRoute.size} trips indexed`)
  return tripToRoute
}

async function buildStopToRoutesMap(
  tripToRoute: ReadonlyMap<string, string>
): Promise<Map<string, Set<string>>> {
  console.log('2. Building stop → routes map from stop_times.txt...')
  const stopToRoutes = new Map<string, Set<string>>()
  let processed = 0
  const stream = createReadStream(path.join(FILTERED_DIR, 'stop_times.txt')).pipe(
    parse({ columns: true, skip_empty_lines: true })
  )
  for await (const row of stream) {
    const parsed = StopTimeRowSchema.safeParse(row)
    if (!parsed.success) continue
    const routeId = tripToRoute.get(parsed.data.trip_id)
    if (routeId === undefined) continue
    getOrSet(stopToRoutes, parsed.data.stop_id, () => new Set<string>()).add(routeId)
    processed++
  }
  console.log(`   ${processed} stop_time rows → ${stopToRoutes.size} unique stop IDs`)
  return stopToRoutes
}

async function readStationFeatures(): Promise<z.infer<typeof StationFeatureSchema>[]> {
  console.log('3. Reading subway_stations.geojson...')
  const raw = await fs.readFile(path.join(FILTERED_DIR, 'subway_stations.geojson'), 'utf-8')
  const collection = FeatureCollectionSchema.parse(JSON.parse(raw))
  console.log(`   ${collection.features.length} platform features found`)
  return collection.features
}

function deduplicateStations(
  features: readonly z.infer<typeof StationFeatureSchema>[],
  stopToRoutes: ReadonlyMap<string, Set<string>>
): StationEntry[] {
  console.log('4. Deduplicating platforms → unique stations...')

  type Accumulator = {
    baseName: string
    latSum: number
    lngSum: number
    count: number
    routes: Set<string>
  }

  const stationMap = new Map<string, Accumulator>()

  for (const feature of features) {
    const { stop_id, name } = feature.properties
    const [lng, lat] = feature.geometry.coordinates
    const baseName = toBaseName(name)

    const acc = getOrSet(stationMap, baseName, () => ({
      baseName,
      latSum: 0,
      lngSum: 0,
      count: 0,
      routes: new Set<string>(),
    }))

    acc.latSum += lat
    acc.lngSum += lng
    acc.count += 1

    const routes = stopToRoutes.get(stop_id)
    if (routes !== undefined) {
      for (const r of routes) acc.routes.add(r)
    }
  }

  const stations: StationEntry[] = []
  for (const acc of stationMap.values()) {
    stations.push({
      id: toSlugId(acc.baseName),
      name: acc.baseName,
      lat: acc.latSum / acc.count,
      lng: acc.lngSum / acc.count,
      lines: [...acc.routes].sort(),
    })
  }

  stations.sort((a, b) => a.name.localeCompare(b.name))
  console.log(`   ${stations.length} unique stations`)
  return stations
}

async function writeOutput(stations: readonly StationEntry[]): Promise<void> {
  console.log('5. Writing public/data/stations.json...')
  await fs.mkdir(PUBLIC_DATA_DIR, { recursive: true })
  await fs.writeFile(
    path.join(PUBLIC_DATA_DIR, 'stations.json'),
    JSON.stringify(stations, null, 2),
    'utf-8'
  )

  console.log('6. Copying subway_lines.geojson -> public/data/lines.geojson...')
  await fs.copyFile(
    path.join(FILTERED_DIR, 'subway_lines.geojson'),
    path.join(PUBLIC_DATA_DIR, 'lines.geojson')
  )
}

// Entry point

async function buildStationIndex(): Promise<void> {
  const tripToRoute = await buildTripToRouteMap()
  const stopToRoutes = await buildStopToRoutesMap(tripToRoute)
  const features = await readStationFeatures()
  const stations = deduplicateStations(features, stopToRoutes)
  await writeOutput(stations)
  console.log('\nDone! Station index built successfully.')
}

buildStationIndex().catch((err: unknown) => {
  console.error('Script failed:', err instanceof Error ? err.message : err)
  process.exit(1)
})
