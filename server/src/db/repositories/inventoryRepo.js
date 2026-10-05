import { query } from '../pool.js'

export async function getInventoryByProductId(productId, dbClient = null) {
  const runner = dbClient || { query }
  const { rows } = await runner.query(
    'SELECT * FROM inventory WHERE product_id = $1 LIMIT 1',
    [Number(productId)]
  )
  return rows[0] || null
}

export async function getAllInventory() {
  const { rows } = await query(`
    SELECT 
      i.*,
      m.name AS product_name,
      m.slot,
      m.price,
      m.active
    FROM inventory i
    JOIN menu_items m ON m.id = i.product_id
    ORDER BY m.id ASC
  `)
  return rows
}

/**
 * Concurrency-safe row locking: SELECT ... FOR UPDATE
 * Ensures available_quantity >= requestedQty
 * Invariant: available_quantity >= 0 always holds
 */
export async function lockAndReserveStock(productId, quantity, dbClient) {
  const parsedId = Number(productId)
  const qty = Number(quantity)

  // 1. Lock inventory row exclusively
  const { rows } = await dbClient.query(
    'SELECT * FROM inventory WHERE product_id = $1 FOR UPDATE',
    [parsedId]
  )

  const inv = rows[0]
  if (!inv) {
    throw new Error(`Inventory not found for product id ${productId}`)
  }

  if (inv.available_quantity < qty) {
    return {
      success: false,
      reason: 'OUT_OF_STOCK',
      available: inv.available_quantity,
      requested: qty,
    }
  }

  // 2. Atomically decrement available, increment reserved
  const updateRes = await dbClient.query(
    `UPDATE inventory
     SET available_quantity = available_quantity - $1,
         reserved_quantity  = reserved_quantity + $1,
         version            = version + 1,
         updated_at         = NOW()
     WHERE product_id = $2
     RETURNING *`,
    [qty, parsedId]
  )

  // Also update menu_items qty for backward compatibility
  await dbClient.query(
    'UPDATE menu_items SET qty = $1, updated_at = NOW() WHERE id = $2',
    [updateRes.rows[0].available_quantity, parsedId]
  )

  return {
    success: true,
    inventory: updateRes.rows[0],
  }
}

/**
 * On payment success: transfer from reserved_quantity to sold_quantity
 */
export async function confirmReservedStock(productId, quantity, dbClient) {
  const parsedId = Number(productId)
  const qty = Number(quantity)

  const { rows } = await dbClient.query(
    `UPDATE inventory
     SET reserved_quantity = GREATEST(0, reserved_quantity - $1),
         sold_quantity     = sold_quantity + $1,
         version           = version + 1,
         updated_at        = NOW()
     WHERE product_id = $2
     RETURNING *`,
    [qty, parsedId]
  )

  return rows[0] || null
}

/**
 * On payment failure or reservation expiry: return from reserved_quantity back to available_quantity
 */
export async function releaseReservedStock(productId, quantity, dbClient) {
  const parsedId = Number(productId)
  const qty = Number(quantity)

  const { rows } = await dbClient.query(
    `UPDATE inventory
     SET reserved_quantity  = GREATEST(0, reserved_quantity - $1),
         available_quantity = available_quantity + $1,
         version            = version + 1,
         updated_at         = NOW()
     WHERE product_id = $2
     RETURNING *`,
    [qty, parsedId]
  )

  // Sync menu_items qty
  if (rows[0]) {
    await dbClient.query(
      'UPDATE menu_items SET qty = $1, updated_at = NOW() WHERE id = $2',
      [rows[0].available_quantity, parsedId]
    )
  }

  return rows[0] || null
}

/**
 * On order cancellation: return from sold_quantity back to available_quantity
 */
export async function returnSoldStock(productId, quantity, dbClient) {
  const parsedId = Number(productId)
  const qty = Number(quantity)

  const { rows } = await dbClient.query(
    `UPDATE inventory
     SET sold_quantity      = GREATEST(0, sold_quantity - $1),
         available_quantity = available_quantity + $1,
         version            = version + 1,
         updated_at         = NOW()
     WHERE product_id = $2
     RETURNING *`,
    [qty, parsedId]
  )

  // Sync menu_items qty
  if (rows[0]) {
    await dbClient.query(
      'UPDATE menu_items SET qty = $1, updated_at = NOW() WHERE id = $2',
      [rows[0].available_quantity, parsedId]
    )
  }

  return rows[0] || null
}

export async function resetInventoryStock(productId, totalQuantity, dbClient = null) {
  const runner = dbClient || { query }
  const parsedId = Number(productId)
  const qty = Number(totalQuantity)

  const { rows } = await runner.query(
    `INSERT INTO inventory (product_id, available_quantity, reserved_quantity, sold_quantity, version, updated_at)
     VALUES ($1, $2, 0, 0, 1, NOW())
     ON CONFLICT (product_id) DO UPDATE
     SET available_quantity = $2,
         reserved_quantity  = 0,
         sold_quantity      = 0,
         version            = inventory.version + 1,
         updated_at         = NOW()
     RETURNING *`,
    [parsedId, qty]
  )

  await runner.query('UPDATE menu_items SET qty = $1 WHERE id = $2', [qty, parsedId])
  return rows[0]
}
