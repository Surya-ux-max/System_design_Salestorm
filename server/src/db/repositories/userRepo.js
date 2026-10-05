import bcrypt from 'bcryptjs'
import { query } from '../pool.js'

export function toClientUser(u) {
  if (!u) return null
  return {
    id: String(u.id),
    _id: String(u.id),
    name: u.name,
    email: u.email,
    role: u.role,
    phone: u.phone || '',
    active: Boolean(u.active),
    lastLogin: u.last_login,
    loginCount: Number(u.login_count || 0),
    createdAt: u.created_at,
  }
}

export async function findById(id) {
  const parsedId = Number(id)
  if (isNaN(parsedId)) return null
  const { rows } = await query('SELECT * FROM users WHERE id = $1 LIMIT 1', [parsedId])
  return rows[0] || null
}

export async function findByEmail(email) {
  if (!email) return null
  const cleanEmail = email.toLowerCase().trim()
  const { rows } = await query('SELECT * FROM users WHERE email = $1 LIMIT 1', [cleanEmail])
  return rows[0] || null
}

export async function createWithPassword({ name, email, password, role, phone = '' }) {
  const salt = await bcrypt.genSalt(10)
  const passwordHash = await bcrypt.hash(password, salt)
  const cleanEmail = email.toLowerCase().trim()

  const { rows } = await query(
    `INSERT INTO users (name, email, password_hash, role, phone, active, login_count, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, true, 0, NOW(), NOW())
     RETURNING *`,
    [name.trim(), cleanEmail, passwordHash, role, phone.trim()]
  )
  return rows[0]
}

export async function verifyPassword(plain, passwordHash) {
  return bcrypt.compare(plain, passwordHash)
}

export async function updateLoginStats(id) {
  const { rows } = await query(
    `UPDATE users
     SET last_login = NOW(), login_count = COALESCE(login_count, 0) + 1, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [Number(id)]
  )
  return rows[0]
}

export async function getAllUsers() {
  const { rows } = await query(
    `SELECT id, name, email, role, phone, active, last_login, login_count, created_at
     FROM users
     ORDER BY created_at DESC`
  )
  return rows.map(toClientUser)
}

export async function updateUser(id, fields) {
  const parsedId = Number(id)
  if (isNaN(parsedId)) return null

  const allowed = ['name', 'phone', 'active', 'role']
  const updates = []
  const values = []
  let index = 1

  for (const key of allowed) {
    if (fields[key] !== undefined) {
      updates.push(`${key} = $${index++}`)
      values.push(fields[key])
    }
  }

  if (fields.password) {
    const salt = await bcrypt.genSalt(10)
    const hash = await bcrypt.hash(fields.password, salt)
    updates.push(`password_hash = $${index++}`)
    values.push(hash)
  }

  if (updates.length === 0) {
    return findById(parsedId)
  }

  updates.push(`updated_at = NOW()`)
  values.push(parsedId)

  const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = $${index} RETURNING *`
  const { rows } = await query(sql, values)
  return rows[0] || null
}

export async function deleteUser(id) {
  const parsedId = Number(id)
  if (isNaN(parsedId)) return null
  const { rows } = await query('DELETE FROM users WHERE id = $1 RETURNING *', [parsedId])
  return rows[0] || null
}

export async function countUsers() {
  const { rows } = await query('SELECT COUNT(*)::int AS count FROM users')
  return rows[0]?.count || 0
}
