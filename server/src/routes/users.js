import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { User, AuditLog } from '../db.js'
import { requireAuth, requireRole } from './auth.js'

const router = Router()

/* GET /api/users — admin only */
router.get('/', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const users = await User.find().select('-passwordHash').sort({ createdAt: -1 })
    res.json(users)
  } catch (e) { next(e) }
})

/* POST /api/users — admin creates a new user */
router.post('/', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const { name, email, password, role, phone } = req.body
    if (!name || !email || !password || !role)
      return res.status(400).json({ error: 'name, email, password, role are required' })
    if (!['admin', 'staff'].includes(role))
      return res.status(400).json({ error: 'role must be admin or staff' })

    const exists = await User.findOne({ email: email.toLowerCase() })
    if (exists) return res.status(409).json({ error: 'Email already registered' })

    const user = await User.createWithPassword({ name, email, password, role, phone: phone || '' })

    await AuditLog.create({
      user:   req.user._id,
      role:   req.user.role,
      action: 'CREATE_USER',
      detail: `Created ${role} account for ${email}`,
      ip:     req.ip,
    })

    res.status(201).json(user.toClient())
  } catch (e) { next(e) }
})

/* PATCH /api/users/:id — admin updates user */
router.patch('/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
    if (!user) return res.status(404).json({ error: 'User not found' })

    const { name, phone, active, role, password } = req.body
    if (name   !== undefined) user.name   = name
    if (phone  !== undefined) user.phone  = phone
    if (active !== undefined) user.active = active
    if (role   !== undefined && ['admin','staff'].includes(role)) user.role = role
    if (password) {
      const salt = await bcrypt.genSalt(10)
      user.passwordHash = await bcrypt.hash(password, salt)
    }

    await user.save()

    await AuditLog.create({
      user:   req.user._id,
      role:   req.user.role,
      action: 'UPDATE_USER',
      detail: `Updated user ${user.email}`,
      ip:     req.ip,
    })

    res.json(user.toClient())
  } catch (e) { next(e) }
})

/* DELETE /api/users/:id — admin deletes user (cannot delete self) */
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    if (req.params.id === req.user._id.toString())
      return res.status(400).json({ error: 'Cannot delete your own account' })

    const user = await User.findByIdAndDelete(req.params.id)
    if (!user) return res.status(404).json({ error: 'User not found' })

    await AuditLog.create({
      user:   req.user._id,
      role:   req.user.role,
      action: 'DELETE_USER',
      detail: `Deleted user ${user.email}`,
      ip:     req.ip,
    })

    res.status(204).send()
  } catch (e) { next(e) }
})

/* GET /api/users/audit — admin views audit log */
router.get('/audit', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const logs = await AuditLog.find()
      .populate('user', 'name email role')
      .sort({ createdAt: -1 })
      .limit(200)
    res.json(logs)
  } catch (e) { next(e) }
})

export default router
