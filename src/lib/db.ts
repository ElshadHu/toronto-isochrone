import mysql from 'mysql2/promise'

type Pool = ReturnType<typeof mysql.createPool>

const createPool = (): Pool => {
  const url = process.env.DATABASE_URL
  if (typeof url !== 'string' || url.length === 0) {
    throw new Error('DATABASE_URL environment variable is missing or empty')
  }
  return mysql.createPool({
    uri: url,
    waitForConnections: true,
    connectionLimit: 10,
    maxIdle: 10,
    idleTimeout: 60000,
    queueLimit: 0,
  })
}

declare global {
  // TypeScript requires `var` for global scope declarations
  // eslint-disable-next-line no-var
  var __mysqlPool: Pool | undefined
}

let _db: Pool | undefined = globalThis.__mysqlPool

export const db: Pool = new Proxy({} as Pool, {
  get(_, prop) {
    if (!_db) {
      _db = createPool()
      if (process.env.NODE_ENV !== 'production') {
        globalThis.__mysqlPool = _db
      }
    }
    return Reflect.get(_db, prop)
  },
})
