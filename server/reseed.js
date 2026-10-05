import 'dotenv/config'
import { migrate } from './src/db/migrate.js'
import { forceSeed } from './src/db/seed.js'
import { pool } from './src/db/pool.js'

async function run() {
  try {
    await migrate()
    await forceSeed()
    console.log('✅ Reseed completed successfully')
    await pool.end()
    process.exit(0)
  } catch (e) {
    console.error('❌ Reseed failed:', e)
    await pool.end()
    process.exit(1)
  }
}

run()
