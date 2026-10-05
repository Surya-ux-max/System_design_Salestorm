import pg from 'pg'
import 'dotenv/config'

const { Pool } = pg

const connectionString =
  process.env.DATABASE_URL ||
  `postgresql://${process.env.PGUSER || 'postgres'}:${process.env.PGPASSWORD || 'root'}@${process.env.PGHOST || 'localhost'}:${process.env.PGPORT || 5432}/${process.env.PGDATABASE || 'Bill4Food'}`

export const pool = new Pool({
  connectionString,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
})

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL client error:', err)
})

export async function query(text, params) {
  return pool.query(text, params)
}

export async function getClient() {
  return pool.connect()
}
