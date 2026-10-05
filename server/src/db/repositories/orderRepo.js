import { query, getClient } from '../pool.js'

function formatOrderTime(d) {
  if (!d) return ''
  return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}

export function toClientOrder(order, payment = null) {
  if (!order) return null
  return {
    id: String(order.id),
    _id: String(order.id),
    token: order.token,
    slot: order.slot,
    items: order.items,
    lines: typeof order.lines === 'string' ? JSON.parse(order.lines) : (order.lines || []),
    total: Number(order.total),
    status: order.status,
    paymentStatus: order.payment_status,
    reservationId: order.reservation_id || null,
    idempotencyKey: order.idempotency_key || null,
    time: formatOrderTime(order.created_at),
    createdAt: order.created_at,
    servedAt: order.served_at,
    payment: payment
      ? {
          id: String(payment.id),
          _id: String(payment.id),
          method: payment.method,
          status: payment.status,
          upiId: payment.upi_id,
          payerUpiId: payment.payer_upi_id,
          txnRef: payment.txn_ref,
          paidAt: payment.paid_at,
          amount: Number(payment.amount),
        }
      : null,
  }
}

export async function getNextToken(client = null) {
  const runner = client || { query }
  const { rows } = await runner.query(
    `INSERT INTO counters (id, seq)
     VALUES ('global', 1)
     ON CONFLICT (id) DO UPDATE SET seq = counters.seq + 1
     RETURNING seq`
  )
  const seq = rows[0].seq
  return `T${String(seq).padStart(3, '0')}`
}

export async function getOrders({ slot, status } = {}) {
  const where = []
  const values = []
  let index = 1

  if (slot && slot !== 'all') {
    where.push(`o.slot = $${index++}`)
    values.push(slot)
  }

  if (status) {
    where.push(`o.status = $${index++}`)
    values.push(status)
  }

  const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''

  const sql = `
    SELECT
      o.*,
      p.id AS payment_row_id,
      p.method AS payment_method,
      p.status AS payment_row_status,
      p.upi_id AS payment_upi_id,
      p.payer_upi_id AS payment_payer_upi_id,
      p.txn_ref AS payment_txn_ref,
      p.paid_at AS payment_paid_at,
      p.amount AS payment_amount
    FROM orders o
    LEFT JOIN payments p ON p.order_id = o.id
    ${whereClause}
    ORDER BY o.created_at DESC
  `

  const { rows } = await query(sql, values)
  return rows.map((r) => {
    const payment = r.payment_row_id
      ? {
          id: r.payment_row_id,
          method: r.payment_method,
          status: r.payment_row_status,
          upi_id: r.payment_upi_id,
          payer_upi_id: r.payment_payer_upi_id,
          txn_ref: r.payment_txn_ref,
          paid_at: r.payment_paid_at,
          amount: r.payment_amount,
        }
      : null

    return toClientOrder(r, payment)
  })
}

export async function findOrderByToken(token, dbClient = null) {
  const runner = dbClient || { query }
  const { rows } = await runner.query('SELECT * FROM orders WHERE token = $1 LIMIT 1', [token])
  return rows[0] || null
}

export async function findOrderById(id, dbClient = null) {
  const runner = dbClient || { query }
  const { rows } = await runner.query('SELECT * FROM orders WHERE id = $1 LIMIT 1', [Number(id)])
  return rows[0] || null
}

export async function findOrderByReservationId(reservationId, dbClient = null) {
  if (!reservationId) return null
  const runner = dbClient || { query }
  const { rows } = await runner.query(
    'SELECT * FROM orders WHERE reservation_id = $1 LIMIT 1',
    [reservationId]
  )
  return rows[0] || null
}

export async function findOrderByIdempotencyKey(key, dbClient = null) {
  if (!key) return null
  const runner = dbClient || { query }
  const { rows } = await runner.query(
    'SELECT * FROM orders WHERE idempotency_key = $1 LIMIT 1',
    [key]
  )
  return rows[0] || null
}

export async function createOrderRecord(
  {
    token,
    slot,
    items,
    lines,
    total,
    status = 'CONFIRMED',
    paymentStatus = 'Unpaid',
    reservationId = null,
    idempotencyKey = null,
  },
  dbClient = null
) {
  const runner = dbClient || { query }
  const { rows } = await runner.query(
    `INSERT INTO orders 
     (token, slot, items, lines, total, status, payment_status, reservation_id, idempotency_key, created_at, updated_at)
     VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8, $9, NOW(), NOW())
     RETURNING *`,
    [
      token,
      slot,
      items,
      JSON.stringify(lines),
      Number(total),
      status,
      paymentStatus,
      reservationId,
      idempotencyKey,
    ]
  )
  const order = rows[0]

  // Insert into order_items
  if (Array.isArray(lines)) {
    for (const l of lines) {
      await runner.query(
        `INSERT INTO order_items (order_id, product_id, name, qty, unit_price, line_total, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [order.id, l.itemId ? Number(l.itemId) : null, l.name, Number(l.qty), Number(l.unitPrice), Number(l.lineTotal)]
      )
    }
  }

  return order
}

export async function updateOrderStatus(orderId, status, dbClient = null) {
  const runner = dbClient || { query }
  const { rows } = await runner.query(
    `UPDATE orders
     SET status = $1, updated_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [status, Number(orderId)]
  )
  return rows[0] || null
}

export async function updateOrderPaymentStatus(orderId, paymentStatus, paymentId = null, dbClient = null) {
  const runner = dbClient || { query }
  const { rows } = await runner.query(
    `UPDATE orders
     SET payment_status = $1,
         payment_id     = COALESCE($2, payment_id),
         updated_at     = NOW()
     WHERE id = $3
     RETURNING *`,
    [paymentStatus, paymentId ? Number(paymentId) : null, Number(orderId)]
  )
  return rows[0] || null
}

export async function markOrderServed(token, servedBy = null, dbClient = null) {
  const runner = dbClient || { query }
  const { rows } = await runner.query(
    `UPDATE orders
     SET status     = 'SERVED',
         served_at  = NOW(),
         served_by  = $1,
         updated_at = NOW()
     WHERE token = $2
     RETURNING *`,
    [servedBy ? Number(servedBy) : null, token]
  )
  if (rows.length === 0) return null

  const order = rows[0]
  const { rows: payRows } = await runner.query(
    'SELECT * FROM payments WHERE order_id = $1 LIMIT 1',
    [order.id]
  )
  return toClientOrder(order, payRows[0] || null)
}
