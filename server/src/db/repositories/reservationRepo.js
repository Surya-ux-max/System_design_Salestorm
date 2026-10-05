import { query } from '../pool.js'

export async function createReservation(
  {
    reservationId,
    productId,
    userId = null,
    orderId = null,
    quantity,
    status = 'RESERVED',
    idempotencyKey = null,
    expiresAt,
  },
  dbClient = null
) {
  const runner = dbClient || { query }
  const { rows } = await runner.query(
    `INSERT INTO inventory_reservations 
     (reservation_id, product_id, user_id, order_id, quantity, status, idempotency_key, expires_at, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
     RETURNING *`,
    [
      reservationId,
      Number(productId),
      userId ? Number(userId) : null,
      orderId ? Number(orderId) : null,
      Number(quantity),
      status,
      idempotencyKey,
      expiresAt,
    ]
  )
  return rows[0]
}

export async function findReservationById(reservationId, dbClient = null) {
  const runner = dbClient || { query }
  const { rows } = await runner.query(
    'SELECT * FROM inventory_reservations WHERE reservation_id = $1 LIMIT 1',
    [reservationId]
  )
  return rows[0] || null
}

export async function findReservationByIdempotency(idempotencyKey, dbClient = null) {
  if (!idempotencyKey) return null
  const runner = dbClient || { query }
  const { rows } = await runner.query(
    'SELECT * FROM inventory_reservations WHERE idempotency_key = $1 LIMIT 1',
    [idempotencyKey]
  )
  return rows[0] || null
}

export async function updateReservationStatus(reservationId, status, dbClient = null) {
  const runner = dbClient || { query }
  const { rows } = await runner.query(
    `UPDATE inventory_reservations
     SET status = $1, updated_at = NOW()
     WHERE reservation_id = $2
     RETURNING *`,
    [status, reservationId]
  )
  return rows[0] || null
}

export async function linkOrderToReservation(reservationId, orderId, dbClient = null) {
  const runner = dbClient || { query }
  const { rows } = await runner.query(
    `UPDATE inventory_reservations
     SET order_id = $1, updated_at = NOW()
     WHERE reservation_id = $2
     RETURNING *`,
    [Number(orderId), reservationId]
  )
  return rows[0] || null
}

/**
 * Returns expired reservations that are still holding inventory
 * Locks them with FOR UPDATE SKIP LOCKED to prevent concurrent worker conflicts
 */
export async function lockExpiredReservations(limit = 50, dbClient) {
  const { rows } = await dbClient.query(
    `SELECT * FROM inventory_reservations
     WHERE status IN ('RESERVED', 'PAYMENT_PENDING')
       AND expires_at < NOW()
     LIMIT $1
     FOR UPDATE SKIP LOCKED`,
    [Number(limit)]
  )
  return rows
}
