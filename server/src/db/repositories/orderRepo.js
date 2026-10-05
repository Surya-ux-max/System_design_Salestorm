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

export async function getNextToken(client) {
  const runner = client || { query }
  // Atomic increment of global counter
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

export async function findOrderByToken(token) {
  const { rows } = await query('SELECT * FROM orders WHERE token = $1 LIMIT 1', [token])
  return rows[0] || null
}

export async function findPaymentByOrderId(orderId) {
  const { rows } = await query('SELECT * FROM payments WHERE order_id = $1 LIMIT 1', [Number(orderId)])
  return rows[0] || null
}

export async function createOrderTransaction({ slot, itemsSummary, lines, total, upiId }) {
  const client = await getClient()
  try {
    await client.query('BEGIN')

    // 1. Check stock and validate items
    const verifiedLines = []
    let computedTotal = 0

    for (const line of lines) {
      const { itemId, qty } = line
      const parsedItemId = Number(itemId)
      if (isNaN(parsedItemId) || !qty || qty < 1) {
        throw new Error('Each item needs a valid numeric itemId and positive qty')
      }

      // Lock row for update
      const { rows: itemRows } = await client.query(
        'SELECT * FROM menu_items WHERE id = $1 FOR UPDATE',
        [parsedItemId]
      )
      const item = itemRows[0]
      if (!item || item.slot !== slot) {
        throw new Error(`Invalid menu item for this slot: ${itemId}`)
      }
      if (!item.active) {
        throw new Error(`${item.name} is not available`)
      }
      if (item.qty < qty) {
        throw new Error(`Not enough stock for ${item.name}`)
      }

      const unitPrice = Number(item.price)
      const lineTotal = unitPrice * qty
      computedTotal += lineTotal

      verifiedLines.push({
        itemId: item.id,
        name: item.name,
        qty,
        unitPrice,
        lineTotal,
      })

      // Decrement stock
      await client.query(
        'UPDATE menu_items SET qty = qty - $1, updated_at = NOW() WHERE id = $2',
        [qty, item.id]
      )
    }

    // 2. Generate token
    const token = await getNextToken(client)

    // 3. Insert order
    const summaryText = verifiedLines.map((l) => `${l.name} x${l.qty}`).join(', ')
    const { rows: orderRows } = await client.query(
      `INSERT INTO orders (token, slot, items, lines, total, status, payment_status, created_at, updated_at)
       VALUES ($1, $2, $3, $4::jsonb, $5, 'Pending', 'Unpaid', NOW(), NOW())
       RETURNING *`,
      [token, slot, summaryText, JSON.stringify(verifiedLines), computedTotal]
    )
    const order = orderRows[0]

    // 4. Insert initial payment
    const { rows: paymentRows } = await client.query(
      `INSERT INTO payments (order_id, token, amount, method, status, upi_id, created_at, updated_at)
       VALUES ($1, $2, $3, 'UPI', 'Initiated', $4, NOW(), NOW())
       RETURNING *`,
      [order.id, token, computedTotal, upiId || '']
    )
    const payment = paymentRows[0]

    // Update payment_id in order
    await client.query('UPDATE orders SET payment_id = $1 WHERE id = $2', [payment.id, order.id])
    order.payment_id = payment.id

    await client.query('COMMIT')
    return { order, payment }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export async function updatePaymentAndOrderStatus(token, { status, txnRef, payerUpiId }) {
  const payStatus = status === 'Failed' ? 'Failed' : 'Paid'
  const paidAt = payStatus === 'Paid' ? new Date() : null

  const order = await findOrderByToken(token)
  if (!order) return null

  const { rows: paymentRows } = await query(
    `UPDATE payments
     SET status = $1, txn_ref = $2, payer_upi_id = $3, paid_at = $4, updated_at = NOW()
     WHERE order_id = $5
     RETURNING *`,
    [payStatus, txnRef || '', payerUpiId || '', paidAt, order.id]
  )

  await query(
    'UPDATE orders SET payment_status = $1, updated_at = NOW() WHERE id = $2',
    [payStatus, order.id]
  )

  return paymentRows[0] || null
}

export async function markOrderServed(token, servedBy = null) {
  const { rows } = await query(
    `UPDATE orders
     SET status = 'Served', served_at = NOW(), served_by = $1, updated_at = NOW()
     WHERE token = $2
     RETURNING *`,
    [servedBy ? Number(servedBy) : null, token]
  )
  if (rows.length === 0) return null

  const order = rows[0]
  const payment = await findPaymentByOrderId(order.id)
  return toClientOrder(order, payment)
}
