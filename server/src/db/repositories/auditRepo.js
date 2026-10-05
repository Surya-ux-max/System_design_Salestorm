import { query } from '../pool.js'

export async function createAuditLog({ userId = null, role = '', action, detail = '', ip = '' }) {
  const parsedUserId = userId ? Number(userId) : null
  const { rows } = await query(
    `INSERT INTO audit_logs (user_id, role, action, detail, ip, created_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     RETURNING *`,
    [parsedUserId, role, action, detail, ip]
  )
  return rows[0]
}

export async function getAuditLogs(limit = 200) {
  const { rows } = await query(
    `SELECT
       a.id,
       a.role,
       a.action,
       a.detail,
       a.ip,
       a.created_at AS "createdAt",
       u.id AS "user_id",
       u.name AS "user_name",
       u.email AS "user_email",
       u.role AS "user_role"
     FROM audit_logs a
     LEFT JOIN users u ON u.id = a.user_id
     ORDER BY a.created_at DESC
     LIMIT $1`,
    [Number(limit)]
  )

  return rows.map((r) => ({
    id: String(r.id),
    role: r.role,
    action: r.action,
    detail: r.detail,
    ip: r.ip,
    createdAt: r.createdAt,
    user: r.user_id
      ? {
          id: String(r.user_id),
          name: r.user_name,
          email: r.user_email,
          role: r.user_role,
        }
      : null,
  }))
}
