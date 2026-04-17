import mysql from 'mysql2/promise'
import { runMigrations } from './schema'

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is required')
  const connection = await mysql.createConnection({ uri: url })

  try {
    await runMigrations(connection)
    console.log(
      'Migrations complete — 4 tables created (subway_lines, stations, station_lines, isochrones)'
    )
  } finally {
    await connection.end()
  }
}

void main()
