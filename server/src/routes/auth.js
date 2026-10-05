import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { User, AuditLog } from '../db.js'

const router = Router()
const JWT_SECRET  = process.env.JWT_SECRET  || 'bill4food_secret_change_in_prod'
const JWT_EXPIRES = process.env.JWT_EXPIRES || '8h'

/* ── middleware: verify JWT ──────────────────────────────────── */
export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || ''
    const token  = header.startsWith('Bearer ') ? header.slice(7) : null
    if (!token) return res.status(401).json({ error: 'Not authenticated' })
    const payload = jwt.verify(token, JWT_SECRET)
    const user    = await User.findById(payload.id).select('-passwordHash')
    if (!user || !user.active) return res.status(401).json({ error: 'User not found or inactive' })
    req.user = user
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role))
      return res.status(403).json({ error: 'Insufficient permissions' })
    next()
  }
}

/* POST /api/auth/login */
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required' })

    const user = await User.findOne({ email: email.toLowerCase().trim() })
    if (!user || !user.active)
      return res.status(401).json({ error: 'Invalid credentials' })

    const match = await user.matchPassword(password)
    if (!match)
      return res.status(401).json({ error: 'Invalid credentials' })

    /* update login stats */
    user.lastLogin  = new Date()
    user.loginCount = (user.loginCount || 0) + 1
    await user.save()

    /* audit */
    await AuditLog.create({
      user:   user._id,
      role:   user.role,
      action: 'LOGIN',
      detail: `${user.name} logged in`,
      ip:     req.ip,
    })

    const token = jwt.sign(
      { id: user._id, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    )

    res.json({ token, user: user.toClient() })
  } catch (e) { next(e) }
})

/* GET /api/auth/me */
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user.toClient ? req.user.toClient() : req.user })
})

/* POST /api/auth/logout — client just discards token; we log it */
router.post('/logout', requireAuth, async (req, res, next) => {
  try {
    await AuditLog.create({
      user:   req.user._id,
      role:   req.user.role,
      action: 'LOGOUT',
      detail: `${req.user.name} logged out`,
      ip:     req.ip,
    })
    res.json({ ok: true })
  } catch (e) { next(e) }
})

export default router
