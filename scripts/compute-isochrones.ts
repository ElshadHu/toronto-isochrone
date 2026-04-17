import mysql from 'mysql2/promise'

type StationRow = {
  readonly id: string
  readonly name: string
  readonly lat: number
  readonly lng: number
}

function createSemaphore(limit: number) {
  let active = 0
  const queue: Array<() => void> = []
  return {
    async acquire(): Promise<void> {
      if (active < limit) {
        active++
        return
      }
      return new Promise<void>((resolve) => queue.push(resolve))
    },
    release(): void {
      active--
      const next = queue.shift()
      if (next) {
        active++
        next()
      }
    },
  }
}

async function fetchIsochrone(lat: number, lng: number): Promise<string> {
  const payload = {
    locations: [{ lat, lon: lng }],
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
    const body = await res.text().catch(() => 'no body')
    throw new Error(`Valhalla error ${res.status}: ${res.statusText} — ${body}`)
  }

  return res.text()
}

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is required')

  const connection = await mysql.createConnection({ uri: url })
  const semaphore = createSemaphore(2)

  try {
    const [rows] = await connection.query<mysql.RowDataPacket[]>(
      'SELECT id, name, lat, lng FROM stations ORDER BY name'
    )
    const stations = rows as unknown as readonly StationRow[]
    const total = stations.length
    const [existing] = await connection.query<mysql.RowDataPacket[]>(
      'SELECT station_id FROM isochrones'
    )
    const doneSet = new Set((existing as Array<{ station_id: string }>).map((r) => r.station_id))
    let completed = doneSet.size

    const tasks = stations
      .filter((s) => !doneSet.has(s.id))
      .map(async (station) => {
        await semaphore.acquire()
        try {
          const idx = stations.indexOf(station)
          console.log(`Computing ${idx + 1}/${total}: ${station.name}...`)

          const geojsonStr = await fetchIsochrone(station.lat, station.lng)

          await connection.execute(
            `INSERT INTO isochrones (station_id, geojson)
             VALUES (?, ?)
             ON DUPLICATE KEY UPDATE geojson = VALUES(geojson)`,
            [station.id, geojsonStr]
          )

          completed++
          console.log(`  Done (${completed}/${total})`)
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err)
          console.error(`  Failed ${station.name} (${station.id}): ${message}`)
        } finally {
          semaphore.release()
        }
      })

    await Promise.all(tasks)
    console.log(`\nAll isochrones computed. Total rows: ${completed}`)
  } finally {
    await connection.end()
  }
}

void main()
