import fs from 'node:fs/promises'
import path from 'node:path'
import mysql from 'mysql2/promise'

type RawStation = {
  readonly id: string
  readonly name: string
  readonly lat: number
  readonly lng: number
  readonly lines: readonly string[]
}

type RawLineFeature = {
  readonly properties: {
    readonly route_id: string
    readonly name: string
    readonly color: string
  }
}

type RawGeoJSON = {
  readonly features: readonly RawLineFeature[]
}

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is required')

  const connection = await mysql.createConnection({ uri: url })
  try {
    const stationsRaw = await fs.readFile(
      path.join(process.cwd(), 'public/data/stations.json'),
      'utf-8'
    )
    const stations: readonly RawStation[] = JSON.parse(stationsRaw) as RawStation[]

    const linesRaw = await fs.readFile(
      path.join(process.cwd(), 'public/data/lines.geojson'),
      'utf-8'
    )
    const linesGeoJSON: RawGeoJSON = JSON.parse(linesRaw) as RawGeoJSON

    // Seed subway_lines
    for (const feature of linesGeoJSON.features) {
      const { route_id, name, color } = feature.properties
      await connection.execute(
        `INSERT INTO subway_lines (id, name, color) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE name = VALUES(name), color = VALUES(color)`,
        [route_id, name, color]
      )
    }
    console.log(`Seeded ${linesGeoJSON.features.length} lines`)

    // Seed stations + station_lines
    for (const station of stations) {
      await connection.execute(
        `INSERT INTO stations (id, name, lat, lng) VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name = VALUES(name), lat = VALUES(lat), lng = VALUES(lng)`,
        [station.id, station.name, station.lat, station.lng]
      )

      for (const lineId of station.lines) {
        await connection.execute(
          `INSERT INTO station_lines (station_id, line_id) VALUES (?, ?)
           ON DUPLICATE KEY UPDATE station_id = station_id`,
          [station.id, lineId]
        )
      }
    }
    console.log(`Seeded ${stations.length} stations with line associations`)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`Seed failed: ${message}`)
    process.exit(1)
  } finally {
    await connection.end()
  }
}

void main()
