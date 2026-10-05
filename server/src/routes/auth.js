import { Router } from 'express'
import jwt from 'jsonwebtoken'
import {
  findById,
  findByEmail,
  verifyPassword,
  updateLoginStats,
  toClientUser,
} from '../db/repositories/userRepo.js'
import { createAuditLog } from '../db/repositories/auditRepo.js'

const router = Router()
const JWT_SECRET = process.env.JWT_SECRET || 'bill4food_sece_secret_2024'
const JWT_EXPIRES = process.env.JWT_EXPIRES || '8h'

/* ── middleware: verify JWT ──────────────────────────────────── */
export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : null
    if (!token) return res.status(401).json({ error: 'Not authenticated' })

    const payload = jwt.verify(token, JWT_SECRET)
    const user = await findById(payload.id)
    if (!user || !user.active) return res.status(401).json({ error: 'User not found or inactive' })

    req.user = user
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }
    next()
  }
}

/* POST /api/auth/login */
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    const user = await findByEmail(email)
    if (!user || !user.active) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const match = await verifyPassword(password, user.password_hash)
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    /* update login stats */
    const updatedUser = await updateLoginStats(user.id)

    /* audit */
    await createAuditLog({
      userId: user.id,
      role: user.role,
      action: 'LOGIN',
      detail: `${user.name} logged in`,
      ip: req.ip || '',
    })

    const token = jwt.sign(
      { id: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    )

    res.json({ token, user: toClientUser(updatedUser || user) })
  } catch (e) {
    next(e)
  }
})

/* GET /api/auth/me */
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: toClientUser(req.user) })
})

/* POST /api/auth/logout */
router.post('/logout', requireAuth, async (req, res, next) => {
  try {
    await createAuditLog({
      userId: req.user.id,
      role: req.user.role,
      action: 'LOGOUT',
      detail: `${req.user.name} logged out`,
      ip: req.ip || '',
    })
    res.json({ ok: true })
  } catch (e) {
    next(e)
  }
})

export default router
