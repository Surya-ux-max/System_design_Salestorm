import { query } from './pool.js'
import { schemaSql } from './schema.js'

export async function migrate() {
  try {
    await query(schemaSql)

    // Sync menu items to inventory table
    await query(`
      INSERT INTO inventory (product_id, available_quantity, reserved_quantity, sold_quantity, version, updated_at)
      SELECT id, qty, 0, 0, 1, NOW()
      FROM menu_items
      ON CONFLICT (product_id) DO NOTHING
    `)

    console.log('✅ PostgreSQL database schema & inventory tables migrated successfully')
  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  }
}
