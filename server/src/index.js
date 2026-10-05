import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { connectDB } from './db.js'
import menuRouter     from './routes/menu.js'
import ordersRouter   from './routes/orders.js'
import settingsRouter from './routes/settings.js'
import authRouter     from './routes/auth.js'
import usersRouter    from './routes/users.js'
import { seedIfEmpty } from './seed.js'

const app  = express()
const PORT = Number(process.env.PORT) || 5000
const allowedOrigins = [
  process.env.CLIENT_ORIGIN,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'https://bill4-food.vercel.app'
].filter(Boolean)

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(null, true)
    }
  },
  credentials: true
}))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.get('/health', (_, res) => res.json({ ok: true }))

app.use('/api/auth',     authRouter)
app.use('/api/users',    usersRouter)
app.use('/api/menu',     menuRouter)
app.use('/api/orders',   ordersRouter)
app.use('/api/settings', settingsRouter)

app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ error: err.message || 'Server error' })
})

const uri = process.env.MONGODB_URI
if (!uri) {
  console.error('Set MONGODB_URI in .env')
  process.exit(1)
}

connectDB(uri)
  .then(() => seedIfEmpty())
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Bill4Food API → http://localhost:${PORT}`)
    })
  })
  .catch(err => { console.error(err); process.exit(1) })
