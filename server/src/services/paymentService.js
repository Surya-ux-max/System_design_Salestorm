import { randomUUID } from 'crypto'
import { getClient } from '../db/pool.js'
import {
  createPayment,
  findPaymentByToken,
  updatePaymentStatus,
} from '../db/repositories/paymentRepo.js'
import { findOrderByToken, updateOrderPaymentStatus } from '../db/repositories/orderRepo.js'
import { confirmReservation, releaseReservation } from './inventoryService.js'
import { createOutboxEvent } from '../db/repositories/outboxRepo.js'

let simulationMode = {
  enabled: false,
  successRate: 0.95, // 95% success / 5% failure as per hackathon spec
  forceOutcome: null, // 'SUCCESS' | 'FAILED' | 'TIMEOUT' | null
}

export function setPaymentSimulationConfig(config = {}) {
  simulationMode = { ...simulationMode, ...config }
  console.log('[PaymentService] Updated simulation config:', simulationMode)
}

export function getPaymentSimulationConfig() {
  return { ...simulationMode }
}

export async function processPayment({
  token,
  txnRef = '',
  payerUpiId = '',
  idempotencyKey = null,
  forceOutcome = null,
}) {
  const client = await getClient()

  try {
    await client.query('BEGIN')

    const order = await findOrderByToken(token, client)
    if (!order) {
      await client.query('ROLLBACK')
      return { success: false, code: 'ORDER_NOT_FOUND', message: 'Order not found' }
    }

    let payment = await findPaymentByToken(token, client)
    if (!payment) {
      await client.query('ROLLBACK')
      return { success: false, code: 'PAYMENT_NOT_FOUND', message: 'Payment record not found' }
    }

    // 1. Idempotency check: If already successfully paid, return existing result
    if (payment.status === 'Paid') {
      await client.query('COMMIT')
      return {
        success: true,
        alreadyProcessed: true,
        payment,
        order,
      }
    }

    // 2. Determine Outcome (Simulation / Hackathon rules)
    const outcomeOverride = forceOutcome || simulationMode.forceOutcome
    let finalOutcome = 'SUCCESS'

    if (outcomeOverride) {
      finalOutcome = outcomeOverride
    } else if (simulationMode.enabled) {
      finalOutcome = Math.random() < simulationMode.successRate ? 'SUCCESS' : 'FAILED'
    }

    // 3. Handle Outcome paths
    if (finalOutcome === 'TIMEOUT') {
      // Timeout: Keep in PAYMENT_PENDING for retry
      await updatePaymentStatus(
        payment.id,
        {
          status: 'Initiated',
          failReason: 'Payment gateway timeout. Verification pending.',
        },
        client
      )
      await updateOrderPaymentStatus(order.id, 'Unpaid', payment.id, client)

      await client.query('COMMIT')
      return {
        success: false,
        code: 'PAYMENT_TIMEOUT',
        message: 'Payment verification timed out. Please retry safely.',
        payment,
      }
    }

    if (finalOutcome === 'FAILED') {
      // Failure: Mark payment Failed, release inventory reservation
      const updatedPayment = await updatePaymentStatus(
        payment.id,
        {
          status: 'Failed',
          failReason: 'UPI transaction rejected or insufficient funds',
        },
        client
      )
      await updateOrderPaymentStatus(order.id, 'Failed', payment.id, client)

      if (order.reservation_id) {
        await releaseReservation(order.reservation_id, 'PAYMENT_FAILED', client)
      }

      await client.query('COMMIT')
      return {
        success: false,
        code: 'PAYMENT_FAILED',
        message: 'Payment failed. Your reserved item has been released.',
        payment: updatedPayment,
      }
    }

    // 4. Success Path
    const updatedPayment = await updatePaymentStatus(
      payment.id,
      {
        status: 'Paid',
        txnRef: txnRef || `UPI_${Date.now()}`,
        payerUpiId: payerUpiId || '',
      },
      client
    )

    await updateOrderPaymentStatus(order.id, 'Paid', payment.id, client)

    // Confirm inventory reservation (reserve -> sold)
    if (order.reservation_id) {
      await confirmReservation(order.reservation_id, client)
    }

    // Transactional Outbox: Write order event inside SAME db transaction
    const eventId = `evt_${randomUUID().replace(/-/g, '').slice(0, 16)}`
    await createOutboxEvent(
      {
        eventId,
        eventType: 'ORDER_PAYMENT_SUCCESS',
        payload: {
          orderId: order.id,
          token: order.token,
          reservationId: order.reservation_id,
          total: order.total,
          items: order.items,
          lines: typeof order.lines === 'string' ? JSON.parse(order.lines) : order.lines,
          paymentId: updatedPayment.id,
          paidAt: updatedPayment.paid_at || new Date().toISOString(),
        },
      },
      client
    )

    await client.query('COMMIT')

    return {
      success: true,
      payment: updatedPayment,
      order,
    }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}
