import 'dotenv/config'
import { connectDB } from './src/db.js'
import { forceSeed } from './src/seed.js'

connectDB(process.env.MONGODB_URI)
  .then(() => forceSeed())
  .then(() => { console.log('Done'); process.exit(0) })
  .catch(e => { console.error(e); process.exit(1) })
