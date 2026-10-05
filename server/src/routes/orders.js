import { Router } from 'express'
import {
  getOrders,
  findOrderByToken,
  createOrderTransaction,
  updatePaymentAndOrderStatus,
  markOrderServed,
} from '../db/repositories/orderRepo.js'
import { getSettings } from '../db/repositories/settingsRepo.js'
import { isWorkingDayNow } from '../utils/slots.js'

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

/* POST /api/orders */
router.post('/', async (req, res, next) => {
  try {
    const { slot, items: lines } = req.body

    if (!slot || !['breakfast', 'lunch', 'dinner'].includes(slot)) {
      return res.status(400).json({ error: 'Invalid or missing slot' })
    }

    if (!Array.isArray(lines) || lines.length === 0) {
      return res.status(400).json({ error: 'items array is required' })
    }

    const settings = await getSettings()

    if (!isWorkingDayNow(settings.workingDays)) {
      return res.status(403).json({ error: 'Canteen is closed today' })
    }

    if (!settings.slotOpen?.[slot]) {
      return res.status(403).json({ error: `Meal slot "${slot}" is not accepting orders` })
    }

    const { order, payment } = await createOrderTransaction({
      slot,
      lines,
      upiId: settings.upiId || UPI_ID,
    })

    const clientOrder = {
      id: String(order.id),
      _id: String(order.id),
      token: order.token,
      slot: order.slot,
      items: order.items,
      lines: typeof order.lines === 'string' ? JSON.parse(order.lines) : order.lines,
      total: Number(order.total),
      status: order.status,
      paymentStatus: order.payment_status,
      time: new Date(order.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      createdAt: order.created_at,
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

    res.status(201).json(clientOrder)
  } catch (e) {
    next(e)
  }
})

/* PATCH /api/orders/:token/payment — student confirms payment after GPay */
router.patch('/:token/payment', async (req, res, next) => {
  try {
    const { txnRef, payerUpiId, status } = req.body
    const updatedPayment = await updatePaymentAndOrderStatus(req.params.token, {
      txnRef,
      payerUpiId,
      status,
    })

    if (!updatedPayment) {
      return res.status(404).json({ error: 'Order not found' })
    }

    res.json({
      ok: true,
      payment: {
        id: String(updatedPayment.id),
        status: updatedPayment.status,
        txnRef: updatedPayment.txn_ref,
        payerUpiId: updatedPayment.payer_upi_id,
        paidAt: updatedPayment.paid_at,
      },
    })
  } catch (e) {
    next(e)
  }
})

/* PATCH /api/orders/:token — mark as Served */
router.patch('/:token', async (req, res, next) => {
  try {
    const { status } = req.body
    if (status !== 'Served') {
      return res.status(400).json({ error: 'Only status "Served" is supported' })
    }

    const servedOrder = await markOrderServed(req.params.token, req.user?.id)
    if (!servedOrder) {
      return res.status(404).json({ error: 'Order not found' })
    }

    res.json(servedOrder)
  } catch (e) {
    next(e)
  }
})

export default router
