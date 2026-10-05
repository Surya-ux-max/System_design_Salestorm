import { query } from '../pool.js'

export function toClientMenuItem(o) {
  if (!o) return null
  return {
    id: String(o.id),
    _id: String(o.id),
    slot: o.slot,
    name: o.name,
    price: Number(o.price),
    qty: Number(o.available_quantity !== undefined ? o.available_quantity : o.qty),
    availableQuantity: Number(o.available_quantity !== undefined ? o.available_quantity : o.qty),
    reservedQuantity: Number(o.reserved_quantity || 0),
    soldQuantity: Number(o.sold_quantity || 0),
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
  const { rows } = await runner.query(
    `SELECT m.*, i.available_quantity, i.reserved_quantity, i.sold_quantity
     FROM menu_items m
     LEFT JOIN inventory i ON i.product_id = m.id
     WHERE m.id = $1 LIMIT 1`,
    [parsedId]
  )
  return rows[0] || null
}

export async function getMenuItems(slot = null) {
  const baseQuery = `
    SELECT m.*, i.available_quantity, i.reserved_quantity, i.sold_quantity
    FROM menu_items m
    LEFT JOIN inventory i ON i.product_id = m.id
  `

  if (slot && ['breakfast', 'lunch', 'dinner'].includes(slot)) {
    const { rows } = await query(
      `${baseQuery} WHERE m.slot = $1 ORDER BY m.id ASC`,
      [slot]
    )
    return rows.map(toClientMenuItem)
  }

  const { rows } = await query(`${baseQuery} ORDER BY m.id ASC`)
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
    `SELECT m.*, i.available_quantity, i.reserved_quantity, i.sold_quantity
     FROM menu_items m
     JOIN inventory i ON i.product_id = m.id
     WHERE m.slot = $1 AND m.active = true AND i.available_quantity > 0
     ORDER BY m.id ASC`,
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
  const item = rows[0]

  // Ensure inventory record exists
  await query(
    `INSERT INTO inventory (product_id, available_quantity, reserved_quantity, sold_quantity, version, updated_at)
     VALUES ($1, $2, 0, 0, 1, NOW())
     ON CONFLICT (product_id) DO UPDATE
     SET available_quantity = $2, updated_at = NOW()`,
    [item.id, Number(qty)]
  )

  return toClientMenuItem({ ...item, available_quantity: Number(qty) })
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

  if (updates.length > 0) {
    updates.push(`updated_at = NOW()`)
    values.push(parsedId)

    const sql = `UPDATE menu_items SET ${updates.join(', ')} WHERE id = $${index} RETURNING *`
    await query(sql, values)
  }

  // If qty was explicitly updated by admin, sync available_quantity
  if (patch.qty !== undefined) {
    await query(
      `INSERT INTO inventory (product_id, available_quantity, reserved_quantity, sold_quantity, version, updated_at)
       VALUES ($1, $2, 0, 0, 1, NOW())
       ON CONFLICT (product_id) DO UPDATE
       SET available_quantity = $2, updated_at = NOW()`,
      [parsedId, Number(patch.qty)]
    )
  }

  const updatedDoc = await findMenuItemById(parsedId)
  return toClientMenuItem(updatedDoc)
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
