import { query } from '../pool.js'

export async function createPayment(
  {
    orderId,
    token,
    amount,
    method = 'UPI',
    status = 'Initiated',
    upiId = '',
    idempotencyKey = null,
  },
  dbClient = null
) {
  const runner = dbClient || { query }
  const { rows } = await runner.query(
    `INSERT INTO payments 
     (order_id, token, amount, method, status, upi_id, idempotency_key, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
     RETURNING *`,
    [
      Number(orderId),
      token,
      Number(amount),
      method,
      status,
      upiId,
      idempotencyKey,
    ]
  )
  return rows[0]
}

export async function findPaymentByOrderId(orderId, dbClient = null) {
  const runner = dbClient || { query }
  const { rows } = await runner.query(
    'SELECT * FROM payments WHERE order_id = $1 LIMIT 1',
    [Number(orderId)]
  )
  return rows[0] || null
}

export async function findPaymentByToken(token, dbClient = null) {
  const runner = dbClient || { query }
  const { rows } = await runner.query(
    'SELECT * FROM payments WHERE token = $1 ORDER BY id DESC LIMIT 1',
    [token]
  )
  return rows[0] || null
}

export async function updatePaymentStatus(
  paymentId,
  { status, txnRef, payerUpiId, failReason = '' },
  dbClient = null
) {
  const runner = dbClient || { query }
  const paidAt = status === 'Paid' ? new Date() : null

  const { rows } = await runner.query(
    `UPDATE payments
     SET status       = $1,
         txn_ref      = COALESCE($2, txn_ref),
         payer_upi_id = COALESCE($3, payer_upi_id),
         paid_at      = $4,
         fail_reason  = $5,
         updated_at   = NOW()
     WHERE id = $6
     RETURNING *`,
    [status, txnRef, payerUpiId, paidAt, failReason, Number(paymentId)]
  )
  return rows[0] || null
}
