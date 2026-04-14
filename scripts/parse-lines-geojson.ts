import { parse } from 'csv-parse'
import { createReadStream, existsSync, promises as fs } from 'node:fs'
import * as path from 'node:path'
import { z } from 'zod'

const DATA_DIR = path.resolve(process.cwd(), 'valhalla_data')
const RAW_DIR = path.join(DATA_DIR, 'raw_gtfs')
const FILTERED_DIR = path.join(DATA_DIR, 'gtfs_feeds', 'ttc')
const OUTPUT_FILE = path.join(FILTERED_DIR, 'subway_lines.geojson')

const GtfsRouteSchema = z
  .object({
    route_id: z.string(),
    route_long_name: z.string().optional(),
    route_color: z.string().optional(),
  })
  .passthrough()

const GtfsTripSchema = z
  .object({
    route_id: z.string(),
    shape_id: z.string(),
  })
  .passthrough()

const GtfsShapeSchema = z
  .object({
    shape_id: z.string(),
    shape_pt_lat: z.coerce.number(),
    shape_pt_lon: z.coerce.number(),
    shape_pt_sequence: z.coerce.number(),
  })
  .passthrough()

export async function generateSubwayGeoJSON(): Promise<void> {
  const routesPath = path.join(FILTERED_DIR, 'routes.txt')
  const tripsPath = path.join(RAW_DIR, 'trips.txt')
  const shapesPath = path.join(RAW_DIR, 'shapes.txt')

  if (!existsSync(routesPath) || !existsSync(tripsPath) || !existsSync(shapesPath)) {
    throw new Error('Missing requisite GTFS files. Please run data fetch & route filter first.')
  }

  console.log('1. Loading valid Subway Routes...')
  const subwayRoutes = new Map<string, { name: string; color: string }>()

  const routesParser = createReadStream(routesPath).pipe(
    parse({ columns: true, skip_empty_lines: true })
  )
  for await (const row of routesParser) {
    const parsed = GtfsRouteSchema.safeParse(row)
    if (parsed.success) {
      subwayRoutes.set(parsed.data.route_id, {
        name: parsed.data.route_long_name ?? `Route ${parsed.data.route_id}`,
        color: parsed.data.route_color ? `#${parsed.data.route_color}` : '#FFFFFF',
      })
    }
  }

  console.log('2. Mapping Subway Routes to active Shape IDs...')
  // We only need one distinct shape per route. For TTC, we might want the longest shape
  // to ensure we capture the whole line.
  const routeShapes = new Map<string, Set<string>>()

  const tripsParser = createReadStream(tripsPath).pipe(
    parse({ columns: true, skip_empty_lines: true })
  )
  for await (const row of tripsParser) {
    const parsed = GtfsTripSchema.safeParse(row)
    if (parsed.success && subwayRoutes.has(parsed.data.route_id)) {
      if (!routeShapes.has(parsed.data.route_id)) {
        routeShapes.set(parsed.data.route_id, new Set())
      }
      routeShapes.get(parsed.data.route_id)?.add(parsed.data.shape_id)
    }
  }

  // To prevent rendering overlap,  will just pick ONE shape_id that has the most points
  // for each route. So temporarily collect all coordinates for all subway shapes.
  const allTargetShapes = new Set<string>()
  for (const shapes of routeShapes.values()) {
    for (const shapeId of shapes) {
      allTargetShapes.add(shapeId)
    }
  }

  console.log(`3. Extracting geographic coordinates for ${allTargetShapes.size} physical paths...`)
  type ShapePoint = { lat: number; lon: number; seq: number }
  const shapePoints = new Map<string, ShapePoint[]>()

  const shapesParser = createReadStream(shapesPath).pipe(
    parse({ columns: true, skip_empty_lines: true })
  )
  for await (const row of shapesParser) {
    const parsed = GtfsShapeSchema.safeParse(row)
    if (parsed.success && allTargetShapes.has(parsed.data.shape_id)) {
      if (!shapePoints.has(parsed.data.shape_id)) {
        shapePoints.set(parsed.data.shape_id, [])
      }
      shapePoints.get(parsed.data.shape_id)?.push({
        lat: parsed.data.shape_pt_lat,
        lon: parsed.data.shape_pt_lon,
        seq: parsed.data.shape_pt_sequence,
      })
    }
  }

  console.log('4. Compiling pristine GeoJSON...')
  // Now pick the longest shape for each route_id to represent the primary line path
  const features: unknown[] = []

  for (const [routeId, data] of subwayRoutes.entries()) {
    const routeShapeIds = routeShapes.get(routeId)
    if (!routeShapeIds) continue

    let longestShapeId = ''
    let maxPoints = 0

    for (const sid of routeShapeIds) {
      const pts = shapePoints.get(sid)
      if (pts && pts.length > maxPoints) {
        maxPoints = pts.length
        longestShapeId = sid
      }
    }

    const targetPoints = shapePoints.get(longestShapeId)
    if (targetPoints) {
      targetPoints.sort((a, b) => a.seq - b.seq) // Strictly order by sequence

      // GeoJSON coordinates are [longitude, latitude]
      const coordinates = targetPoints.map((pt) => [pt.lon, pt.lat])

      features.push({
        type: 'Feature',
        properties: {
          route_id: routeId,
          name: data.name,
          color: data.color,
        },
        geometry: {
          type: 'LineString',
          coordinates,
        },
      })
    }
  }

  const geojson = {
    type: 'FeatureCollection',
    features,
  }

  await fs.writeFile(OUTPUT_FILE, JSON.stringify(geojson, null, 2), 'utf-8')
  console.log(`\nSuccess! GeoJSON Lines firmly written to: ${OUTPUT_FILE}`)
}

// Execute if run directly
if (require.main === module) {
  generateSubwayGeoJSON().catch((err: unknown) => {
    console.error('GeoJSON Pipeline crashed:')
    if (err instanceof Error) {
      console.error(err.message)
    } else {
      console.error(err)
    }
    process.exit(1)
  })
}
