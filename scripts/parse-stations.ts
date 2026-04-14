import { parse } from 'csv-parse'
import { stringify } from 'csv-stringify'
import { createReadStream, createWriteStream, promises as fs } from 'node:fs'
import { pipeline } from 'node:stream/promises'
import * as path from 'node:path'
import { z } from 'zod'

const DATA_DIR = path.resolve(process.cwd(), 'valhalla_data')
const RAW_DIR = path.join(DATA_DIR, 'raw_gtfs')
const FILTERED_DIR = path.join(DATA_DIR, 'gtfs_feeds', 'ttc')
const RouteSchema = z.object({ route_id: z.string(), route_type: z.string() }).passthrough()
const TripSchema = z.object({ route_id: z.string(), trip_id: z.string() }).passthrough()
const StopTimeSchema = z.object({ trip_id: z.string(), stop_id: z.string() }).passthrough()
const StopSchema = z
  .object({
    stop_id: z.string(),
    stop_name: z.string(),
    stop_lat: z.coerce.number(),
    stop_lon: z.coerce.number(),
  })
  .passthrough()

export async function filterStationsAndTrips(): Promise<void> {
  console.log('1. Identifying active Subway Routes...')
  const subwayRouteIds = new Set<string>()
  const routeParser = createReadStream(path.join(RAW_DIR, 'routes.txt')).pipe(
    parse({ columns: true })
  )
  for await (const row of routeParser) {
    const p = RouteSchema.safeParse(row)
    if (p.success && p.data.route_type === '1') subwayRouteIds.add(p.data.route_id)
  }

  console.log('2. Isolating Subway Trips...')
  const subwayTripIds = new Set<string>()
  const tripStringifier = stringify({ header: true })
  const tripWriter = createWriteStream(path.join(FILTERED_DIR, 'trips.txt'))
  const tripTask = pipeline(tripStringifier, tripWriter)

  const tripParser = createReadStream(path.join(RAW_DIR, 'trips.txt')).pipe(
    parse({ columns: true })
  )
  for await (const row of tripParser) {
    const p = TripSchema.safeParse(row)
    if (p.success && subwayRouteIds.has(p.data.route_id)) {
      subwayTripIds.add(p.data.trip_id)
      tripStringifier.write(p.data)
    }
  }
  tripStringifier.end()
  await tripTask

  console.log('3. Isolating Subway Stop Times (Extremely Intensive)...')
  const subwayStopIds = new Set<string>()
  const timeStringifier = stringify({ header: true })
  const timeWriter = createWriteStream(path.join(FILTERED_DIR, 'stop_times.txt'))
  const timeTask = pipeline(timeStringifier, timeWriter)

  const timeParser = createReadStream(path.join(RAW_DIR, 'stop_times.txt')).pipe(
    parse({ columns: true })
  )
  for await (const row of timeParser) {
    const p = StopTimeSchema.safeParse(row)
    if (p.success && subwayTripIds.has(p.data.trip_id)) {
      subwayStopIds.add(p.data.stop_id)
      timeStringifier.write(p.data)
    }
  }
  timeStringifier.end()
  await timeTask

  console.log(`4. Compiling pristine Stops CSV and GeoJSON for ${subwayStopIds.size} platforms...`)
  const stopStringifier = stringify({ header: true })
  const stopWriter = createWriteStream(path.join(FILTERED_DIR, 'stops.txt'))
  const stopTask = pipeline(stopStringifier, stopWriter)

  const geojsonFeatures: unknown[] = []
  const stopParser = createReadStream(path.join(RAW_DIR, 'stops.txt')).pipe(
    parse({ columns: true })
  )

  for await (const row of stopParser) {
    const p = StopSchema.safeParse(row)
    if (p.success && subwayStopIds.has(p.data.stop_id)) {
      stopStringifier.write(p.data)

      // Also build the map-ready GeoJSON stations
      geojsonFeatures.push({
        type: 'Feature',
        properties: { stop_id: p.data.stop_id, name: p.data.stop_name },
        geometry: { type: 'Point', coordinates: [p.data.stop_lon, p.data.stop_lat] },
      })
    }
  }
  stopStringifier.end()

  await Promise.all([
    stopTask,
    fs.writeFile(
      path.join(FILTERED_DIR, 'subway_stations.geojson'),
      JSON.stringify({ type: 'FeatureCollection', features: geojsonFeatures }, null, 2)
    ),
    // Valhalla MUST have these base GTFS meta-files to successfully compile the transit graph
    fs
      .copyFile(path.join(RAW_DIR, 'agency.txt'), path.join(FILTERED_DIR, 'agency.txt'))
      .catch(() => console.log('No agency.txt found')),
    fs
      .copyFile(path.join(RAW_DIR, 'calendar.txt'), path.join(FILTERED_DIR, 'calendar.txt'))
      .catch(() => console.log('No calendar.txt found')),
    fs
      .copyFile(
        path.join(RAW_DIR, 'calendar_dates.txt'),
        path.join(FILTERED_DIR, 'calendar_dates.txt')
      )
      .catch(() => console.log('No calendar_dates.txt found')),
    fs
      .copyFile(path.join(RAW_DIR, 'feed_info.txt'), path.join(FILTERED_DIR, 'feed_info.txt'))
      .catch(() => console.log('No feed_info.txt found')),
  ])

  console.log('Success! Transit GTFS database completely filtered for Valhalla.')
}

if (require.main === module) {
  filterStationsAndTrips().catch((err: unknown) => {
    console.error('Filter Pipeline crashed:')
    console.error(err instanceof Error ? err.message : err)
    process.exit(1)
  })
}
