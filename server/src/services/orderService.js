import { getClient } from '../db/pool.js'
import {
  createOrderRecord,
  findOrderByToken,
  findOrderById,
  findOrderByReservationId,
  findOrderByIdempotencyKey,
  getNextToken,
  updateOrderStatus,
  updateOrderPaymentStatus,
  toClientOrder,
} from '../db/repositories/orderRepo.js'
import { createPayment, findPaymentByOrderId } from '../db/repositories/paymentRepo.js'
import { linkOrderToReservation } from '../db/repositories/reservationRepo.js'
import { circuitBreaker } from './circuitBreaker.js'

export const VALID_ORDER_STATUSES = [
  'CREATED',
  'PAYMENT_PENDING',
  'CONFIRMED',
  'PROCESSING',
  'READY_FOR_PICKUP',
  'SERVED',
  'CANCELLED',
  'Pending', // Legacy support
]

export async function createOrderFromReservation({
  reservationId,
  slot,
  lines,
  total,
  userId = null,
  idempotencyKey = null,
  upiId = '',
}) {
  // Idempotency check: does an order already exist with this idempotencyKey or reservationId?
  if (idempotencyKey) {
    const existingOrder = await findOrderByIdempotencyKey(idempotencyKey)
    if (existingOrder) {
      const payment = await findPaymentByOrderId(existingOrder.id)
      return {
        isDuplicate: true,
        order: existingOrder,
        payment,
      }
    }
  }

  if (reservationId) {
    const existingByRes = await findOrderByReservationId(reservationId)
    if (existingByRes) {
      const payment = await findPaymentByOrderId(existingByRes.id)
      return {
        isDuplicate: true,
        order: existingByRes,
        payment,
      }
    }
  }

  const client = await getClient()

  try {
    await client.query('BEGIN')

    const token = await getNextToken(client)
    const itemsSummary = lines.map((l) => `${l.name} x${l.qty}`).join(', ')

    // Create order record
    const order = await createOrderRecord(
      {
        token,
        slot,
        items: itemsSummary,
        lines,
        total,
        status: 'PAYMENT_PENDING',
        paymentStatus: 'Unpaid',
        reservationId,
        idempotencyKey,
      },
      client
    )

    // Create linked payment record
    const payment = await createPayment(
      {
        orderId: order.id,
        token,
        amount: total,
        method: 'UPI',
        status: 'Initiated',
        upiId,
        idempotencyKey: idempotencyKey ? `pay_${idempotencyKey}` : null,
      },
      client
    )

    // Link payment ID to order
    await updateOrderPaymentStatus(order.id, 'Unpaid', payment.id, client)
    order.payment_id = payment.id

    // Link reservation to order
    if (reservationId) {
      await linkOrderToReservation(reservationId, order.id, client)
    }

    await client.query('COMMIT')

    return {
      isDuplicate: false,
      order,
      payment,
    }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

/**
 * Event consumer: processes ORDER_PAYMENT_SUCCESS from Outbox / Message Broker
 */
export async function handleOrderCreationEvent(payload) {
  // Check Circuit Breaker: Is Order Service available?
  if (!circuitBreaker.isOrderServiceAvailable()) {
    throw new Error('Order Service is temporarily unavailable. Event retained in outbox for retry.')
  }

  const { orderId, token } = payload
  const order = await findOrderById(orderId)

  if (!order) {
    // If order record wasn't pre-created, create it now idempotently
    return false
  }

  // Idempotency: if already confirmed or further in lifecycle, no-op
  if (['CONFIRMED', 'PROCESSING', 'READY_FOR_PICKUP', 'SERVED'].includes(order.status)) {
    return true
  }

  await updateOrderStatus(order.id, 'CONFIRMED')
  console.log(`[OrderService] Order ${token} successfully transitioned to CONFIRMED via event handler.`)
  return true
}

export async function advanceOrderStatus(token, targetStatus, servedBy = null) {
  const order = await findOrderByToken(token)
  if (!order) return null

  // Validate status transition
  if (!VALID_ORDER_STATUSES.includes(targetStatus)) {
    throw new Error(`Invalid target status: ${targetStatus}`)
  }

  const client = await getClient()
  try {
    await client.query('BEGIN')

    let servedAtClause = ''
    const values = [targetStatus, order.id]

    if (targetStatus === 'SERVED') {
      values.push(new Date())
      values.push(servedBy ? Number(servedBy) : null)
      servedAtClause = ', served_at = $3, served_by = $4'
    }

    const { rows } = await client.query(
      `UPDATE orders
       SET status = $1, updated_at = NOW() ${servedAtClause}
       WHERE id = $2
       RETURNING *`,
      values
    )

    await client.query('COMMIT')

    const updatedOrder = rows[0]
    const payment = await findPaymentByOrderId(updatedOrder.id)
    return toClientOrder(updatedOrder, payment)
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}
