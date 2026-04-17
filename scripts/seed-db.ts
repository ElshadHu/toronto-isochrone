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
        'INSERT IGNORE INTO subway_lines (id, name, color) VALUES (?, ?, ?)',
        [route_id, name, color]
      )
    }
    console.log(`Seeded ${linesGeoJSON.features.length} lines`)

    // Seed stations + station_lines
    for (const station of stations) {
      await connection.execute(
        'INSERT IGNORE INTO stations (id, name, lat, lng) VALUES (?, ?, ?, ?)',
        [station.id, station.name, station.lat, station.lng]
      )

      for (const lineId of station.lines) {
        await connection.execute(
          'INSERT IGNORE INTO station_lines (station_id, line_id) VALUES (?, ?)',
          [station.id, lineId]
        )
      }
    }
    console.log(`Seeded ${stations.length} stations with line associations`)
  } finally {
    await connection.end()
  }
}

void main()
