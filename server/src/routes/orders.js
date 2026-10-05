import { Router } from 'express'
import { randomUUID } from 'crypto'
import { getOrders, findOrderByToken, toClientOrder } from '../db/repositories/orderRepo.js'
import { findPaymentByOrderId } from '../db/repositories/paymentRepo.js'
import { getSettings } from '../db/repositories/settingsRepo.js'
import { isWorkingDayNow } from '../utils/slots.js'
import { reserveItems } from '../services/inventoryService.js'
import { createOrderFromReservation, advanceOrderStatus } from '../services/orderService.js'
import { processPayment } from '../services/paymentService.js'
import {
  getIdempotencyRecord,
  startIdempotencyRecord,
  completeIdempotencyRecord,
} from '../db/repositories/idempotencyRepo.js'

const router = Router()
const UPI_ID = process.env.UPI_ID || 'surprakas14@okaxis'

/* GET /api/orders */
router.get('/', async (req, res, next) => {
  try {
    const { slot, status } = req.query
    const orders = await getOrders({ slot, status })
    res.json(orders)
  } catch (e) {
    next(e)
  }
})

/* POST /api/orders — Idempotent Order & Inventory Reservation */
router.post('/', async (req, res, next) => {
  try {
    const { slot, items: lines } = req.body

    if (!slot || !['breakfast', 'lunch', 'dinner'].includes(slot)) {
      return res.status(400).json({ error: 'Invalid or missing slot' })
    }

    if (!Array.isArray(lines) || lines.length === 0) {
      return res.status(400).json({ error: 'items array is required' })
    }

    // 1. Idempotency Check
    const idempotencyKey =
      req.headers['idempotency-key'] ||
      req.body.idempotencyKey ||
      null

    if (idempotencyKey) {
      const existingRecord = await getIdempotencyRecord(idempotencyKey)
      if (existingRecord && existingRecord.status === 'COMPLETED') {
        return res.status(existingRecord.response_code || 200).json(existingRecord.response_body)
      }
      await startIdempotencyRecord(idempotencyKey, req.originalUrl, req.body)
    }

    // 2. Validate Canteen Operating Hours
    const settings = await getSettings()
    if (!isWorkingDayNow(settings.workingDays)) {
      return res.status(403).json({ error: 'Canteen is closed today' })
    }
    if (!settings.slotOpen?.[slot]) {
      return res.status(403).json({ error: `Meal slot "${slot}" is not accepting orders` })
    }

    // 3. Atomically Reserve Inventory (FOR UPDATE row locking)
    const reservationRes = await reserveItems({
      items: lines,
      slot,
      userId: req.user?.id || null,
      idempotencyKey,
      durationSeconds: 300, // 5 min hold
    })

    if (!reservationRes.success) {
      const errResponse = {
        error: reservationRes.message || 'Sorry, this item is currently sold out.',
        code: reservationRes.code || 'OUT_OF_STOCK',
      }
      if (idempotencyKey) {
        await completeIdempotencyRecord(idempotencyKey, 409, errResponse)
      }
      return res.status(409).json(errResponse)
    }

    // 4. Create Order & Link Reservation
    const orderResult = await createOrderFromReservation({
      reservationId: reservationRes.reservationId,
      slot,
      lines: reservationRes.lines,
      total: reservationRes.total,
      userId: req.user?.id || null,
      idempotencyKey,
      upiId: settings.upiId || UPI_ID,
    })

    const clientOrder = toClientOrder(orderResult.order, orderResult.payment)

    if (idempotencyKey) {
      await completeIdempotencyRecord(idempotencyKey, 201, clientOrder)
    }

    res.status(201).json(clientOrder)
  } catch (e) {
    next(e)
  }
})

/* PATCH /api/orders/:token/payment — Idempotent UPI Payment Confirmation */
router.patch('/:token/payment', async (req, res, next) => {
  try {
    const { txnRef, payerUpiId, status, forceOutcome } = req.body
    const idempotencyKey =
      req.headers['idempotency-key'] ||
      req.body.idempotencyKey ||
      (txnRef ? `pay_${txnRef}` : null)

    const paymentResult = await processPayment({
      token: req.params.token,
      txnRef,
      payerUpiId,
      idempotencyKey,
      forceOutcome: forceOutcome || (status === 'Failed' ? 'FAILED' : null),
    })

    if (!paymentResult.success) {
      const statusCode = paymentResult.code === 'PAYMENT_TIMEOUT' ? 408 : 400
      return res.status(statusCode).json({
        ok: false,
        error: paymentResult.message,
        code: paymentResult.code,
        payment: paymentResult.payment,
      })
    }

    res.json({
      ok: true,
      message: 'Payment Successful',
      payment: {
        id: String(paymentResult.payment.id),
        status: paymentResult.payment.status,
        txnRef: paymentResult.payment.txn_ref,
        payerUpiId: paymentResult.payment.payer_upi_id,
        paidAt: paymentResult.payment.paid_at,
        amount: Number(paymentResult.payment.amount),
      },
    })
  } catch (e) {
    next(e)
  }
})

/* PATCH /api/orders/:token — Order Lifecycle Transition */
router.patch('/:token', async (req, res, next) => {
  try {
    const { status } = req.body
    if (!status) {
      return res.status(400).json({ error: 'Status is required' })
    }

    // Normalize legacy 'Served'
    const targetStatus = status === 'Served' ? 'SERVED' : status

    const updatedOrder = await advanceOrderStatus(req.params.token, targetStatus, req.user?.id)
    if (!updatedOrder) {
      return res.status(404).json({ error: 'Order not found' })
    }

    res.json(updatedOrder)
  } catch (e) {
    next(e)
  }
})

export default router
