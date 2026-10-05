import { query } from '../pool.js'

export function toClientMenuItem(o) {
  if (!o) return null
  return {
    id: String(o.id),
    _id: String(o.id),
    slot: o.slot,
    name: o.name,
    price: Number(o.price),
    qty: Number(o.qty),
    active: Boolean(o.active),
    img: o.img || '',
    tag: o.tag || null,
    tagColor: o.tag_color || '',
    desc: o.description || '',
    createdAt: o.created_at,
    updatedAt: o.updated_at,
  }
}

export async function findMenuItemById(id, dbClient = null) {
  const parsedId = Number(id)
  if (isNaN(parsedId)) return null
  const runner = dbClient || { query }
  const { rows } = await runner.query('SELECT * FROM menu_items WHERE id = $1 LIMIT 1', [parsedId])
  return rows[0] || null
}

export async function getMenuItems(slot = null) {
  if (slot && ['breakfast', 'lunch', 'dinner'].includes(slot)) {
    const { rows } = await query(
      'SELECT * FROM menu_items WHERE slot = $1 ORDER BY id ASC',
      [slot]
    )
    return rows.map(toClientMenuItem)
  }

  const { rows } = await query('SELECT * FROM menu_items ORDER BY id ASC')
  const grouped = { breakfast: [], lunch: [], dinner: [] }
  for (const r of rows) {
    const item = toClientMenuItem(r)
    if (grouped[r.slot]) {
      grouped[r.slot].push(item)
    }
  }
  return grouped
}

export async function getShopMenuItems(slot) {
  const { rows } = await query(
    'SELECT * FROM menu_items WHERE slot = $1 AND active = true AND qty > 0 ORDER BY id ASC',
    [slot]
  )
  return rows.map(toClientMenuItem)
}

export async function createMenuItem({ slot, name, price, qty, active = true, img = '', tag = null, tagColor = '', desc = '', createdBy = null }) {
  const { rows } = await query(
    `INSERT INTO menu_items (slot, name, price, qty, active, img, tag, tag_color, description, created_by, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
     RETURNING *`,
    [
      slot,
      name.trim(),
      Number(price),
      Number(qty),
      active !== false,
      img || '',
      tag || null,
      tagColor || '',
      desc || '',
      createdBy ? Number(createdBy) : null,
    ]
  )
  return toClientMenuItem(rows[0])
}

export async function updateMenuItem(id, patch) {
  const parsedId = Number(id)
  if (isNaN(parsedId)) return null

  const fieldMap = {
    name: 'name',
    price: 'price',
    qty: 'qty',
    active: 'active',
    img: 'img',
    slot: 'slot',
    tag: 'tag',
    tagColor: 'tag_color',
    desc: 'description',
  }

  const updates = []
  const values = []
  let index = 1

  for (const [key, col] of Object.entries(fieldMap)) {
    if (patch[key] !== undefined) {
      updates.push(`${col} = $${index++}`)
      let val = patch[key]
      if (key === 'price' || key === 'qty') val = Number(val)
      values.push(val)
    }
  }

  if (updates.length === 0) {
    const existing = await findMenuItemById(parsedId)
    return toClientMenuItem(existing)
  }

  updates.push(`updated_at = NOW()`)
  values.push(parsedId)

  const sql = `UPDATE menu_items SET ${updates.join(', ')} WHERE id = $${index} RETURNING *`
  const { rows } = await query(sql, values)
  return toClientMenuItem(rows[0] || null)
}

export async function deleteMenuItem(id) {
  const parsedId = Number(id)
  if (isNaN(parsedId)) return null
  const { rows } = await query('DELETE FROM menu_items WHERE id = $1 RETURNING *', [parsedId])
  return rows[0] || null
}

export async function countMenuItems() {
  const { rows } = await query('SELECT COUNT(*)::int AS count FROM menu_items')
  return rows[0]?.count || 0
}

export async function decrementMenuItemQty(id, count, dbClient = null) {
  const runner = dbClient || { query }
  const { rows } = await runner.query(
    `UPDATE menu_items
     SET qty = GREATEST(0, qty - $1), updated_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [Number(count), Number(id)]
  )
  return rows[0] || null
}
