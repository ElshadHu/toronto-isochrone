import type { Connection } from 'mysql2/promise'

const TABLES = [
  `CREATE TABLE IF NOT EXISTS subway_lines (
      id VARCHAR(10) PRIMARY KEY,
      name VARCHAR(50) NOT NULL,
      color VARCHAR(10) NOT NULL
    )`,
  `CREATE TABLE IF NOT EXISTS stations (
      id VARCHAR(100) PRIMARY KEY,
      name VARCHAR(200) NOT NULL,
      lat DOUBLE NOT NULL,
      lng DOUBLE NOT NULL
    )`,

  `CREATE TABLE IF NOT EXISTS station_lines (
      station_id VARCHAR(100) NOT NULL,
      line_id VARCHAR(10) NOT NULL,
      PRIMARY KEY (station_id, line_id),
      FOREIGN KEY (station_id) REFERENCES stations(id) ON DELETE CASCADE,
      FOREIGN KEY (line_id) REFERENCES subway_lines(id) ON DELETE CASCADE
    )`,
  `CREATE TABLE IF NOT EXISTS isochrones (
      station_id VARCHAR(100) PRIMARY KEY,
      geojson LONGTEXT NOT NULL,
      FOREIGN KEY (station_id) REFERENCES stations(id) ON DELETE CASCADE
    )`,
] as const

export async function runMigrations(connection: Connection): Promise<void> {
  for (const ddl of TABLES) {
    await connection.execute(ddl)
  }
}
