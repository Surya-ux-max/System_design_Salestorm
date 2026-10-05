import { query } from './pool.js'
import { schemaSql } from './schema.js'

export async function migrate() {
  try {
    await query(schemaSql)
    console.log('✅ PostgreSQL database schema migrated successfully')
  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  }
}
