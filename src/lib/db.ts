import mysql from 'mysql2/promise'

const databaseUrl = process.env.DATABASE_URL

if (typeof databaseUrl !== 'string' || databaseUrl.length === 0) {
  throw new Error('DATABASE_URL environment variable is missing or empty')
}

const createPool = () => {
  return mysql.createPool({
    uri: databaseUrl,
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
  var __mysqlPool: ReturnType<typeof createPool> | undefined
}

export const db = globalThis.__mysqlPool ?? createPool()

if (process.env.NODE_ENV !== 'production') {
  globalThis.__mysqlPool = db
}
