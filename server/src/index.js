import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { pool } from './db/pool.js'
import { migrate } from './db/migrate.js'
import { seedIfEmpty } from './db/seed.js'
import menuRouter from './routes/menu.js'
import ordersRouter from './routes/orders.js'
import settingsRouter from './routes/settings.js'
import authRouter from './routes/auth.js'
import usersRouter from './routes/users.js'
import internalRouter from './routes/internal.js'
import { initRabbitMQ } from './services/outboxService.js'
import { startOutboxWorker } from './workers/outboxWorker.js'
import { startReservationExpiryWorker } from './workers/reservationExpiryWorker.js'

const app = express()
const PORT = Number(process.env.PORT) || 5000
const allowedOrigins = [
  process.env.CLIENT_ORIGIN,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'https://bill4-food.vercel.app',
].filter(Boolean)

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true)
      } else {
        callback(null, true)
      }
    },
    credentials: true,
  })
)

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.get('/health', (_, res) => res.json({ ok: true, database: 'PostgreSQL', service: 'Bill4Food API' }))

app.use('/api/auth', authRouter)
app.use('/api/users', usersRouter)
app.use('/api/menu', menuRouter)
app.use('/api/orders', ordersRouter)
app.use('/api/settings', settingsRouter)
app.use('/api/internal', internalRouter)

app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ error: err.message || 'Server error' })
})

async function startServer() {
  try {
    // 1. Verify PostgreSQL connection
    const res = await pool.query('SELECT NOW() AS current_time')
    console.log(`✅ PostgreSQL connected to database successfully at ${res.rows[0].current_time}`)

    // 2. Run migrations (including inventory, reservations, idempotency, outbox)
    await migrate()

    // 3. Seed initial data if empty
    await seedIfEmpty()

    // 4. Initialize Messaging & Workers
    await initRabbitMQ()
    startOutboxWorker(3000)
    startReservationExpiryWorker(5000)

    // 5. Start HTTP listener
    app.listen(PORT, () => {
      console.log(`🚀 Bill4Food API running on PostgreSQL → http://localhost:${PORT}`)
    })
  } catch (err) {
    console.error('❌ Failed to initialize server:', err)
    process.exit(1)
  }
}

startServer()
