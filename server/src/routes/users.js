import { Router } from 'express'
import {
  findById,
  findByEmail,
  getAllUsers,
  createWithPassword,
  updateUser,
  deleteUser,
  toClientUser,
} from '../db/repositories/userRepo.js'
import { createAuditLog, getAuditLogs } from '../db/repositories/auditRepo.js'
import { requireAuth, requireRole } from './auth.js'

const router = Router()

/* GET /api/users — admin only */
router.get('/', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const users = await getAllUsers()
    res.json(users)
  } catch (e) {
    next(e)
  }
})

/* POST /api/users — admin creates a new user */
router.post('/', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const { name, email, password, role, phone } = req.body
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'name, email, password, role are required' })
    }
    if (!['admin', 'staff'].includes(role)) {
      return res.status(400).json({ error: 'role must be admin or staff' })
    }

    const exists = await findByEmail(email)
    if (exists) {
      return res.status(409).json({ error: 'Email already registered' })
    }

    const user = await createWithPassword({
      name,
      email,
      password,
      role,
      phone: phone || '',
    })

    await createAuditLog({
      userId: req.user.id,
      role: req.user.role,
      action: 'CREATE_USER',
      detail: `Created ${role} account for ${email}`,
      ip: req.ip || '',
    })

    res.status(201).json(toClientUser(user))
  } catch (e) {
    next(e)
  }
})

/* PATCH /api/users/:id — admin updates user */
router.patch('/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const user = await findById(req.params.id)
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    const { name, phone, active, role, password } = req.body
    const updates = {}
    if (name !== undefined) updates.name = name
    if (phone !== undefined) updates.phone = phone
    if (active !== undefined) updates.active = active
    if (role !== undefined && ['admin', 'staff'].includes(role)) updates.role = role
    if (password) updates.password = password

    const updated = await updateUser(req.params.id, updates)

    await createAuditLog({
      userId: req.user.id,
      role: req.user.role,
      action: 'UPDATE_USER',
      detail: `Updated user ${user.email}`,
      ip: req.ip || '',
    })

    res.json(toClientUser(updated))
  } catch (e) {
    next(e)
  }
})

/* DELETE /api/users/:id — admin deletes user (cannot delete self) */
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    if (String(req.params.id) === String(req.user.id)) {
      return res.status(400).json({ error: 'Cannot delete your own account' })
    }

    const user = await deleteUser(req.params.id)
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    await createAuditLog({
      userId: req.user.id,
      role: req.user.role,
      action: 'DELETE_USER',
      detail: `Deleted user ${user.email}`,
      ip: req.ip || '',
    })

    res.status(204).send()
  } catch (e) {
    next(e)
  }
})

/* GET /api/users/audit — admin views audit log */
router.get('/audit', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const logs = await getAuditLogs(200)
    res.json(logs)
  } catch (e) {
    next(e)
  }
})

export default router
