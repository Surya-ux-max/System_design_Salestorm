import { Router } from 'express'
import mongoose from 'mongoose'
import { Order, MenuItem, Counter, Settings, Payment } from '../db.js'
import { isWorkingDayNow } from '../utils/slots.js'

const router = Router()
const UPI_ID = process.env.UPI_ID || 'surprakas14@okaxis'

function formatOrderTime(d) {
  return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}

function toClientOrder(doc, payment) {
  const o = doc.toObject ? doc.toObject() : doc
  return {
    token:         o.token,
    slot:          o.slot,
    items:         o.items,
    lines:         o.lines,
    total:         o.total,
    status:        o.status,
    paymentStatus: o.paymentStatus,
    time:          formatOrderTime(o.createdAt),
    createdAt:     o.createdAt,
    payment:       payment ? {
      id:          payment._id,
      method:      payment.method,
      status:      payment.status,
      upiId:       payment.upiId,
      payerUpiId:  payment.payerUpiId,
      txnRef:      payment.txnRef,
      paidAt:      payment.paidAt,
      amount:      payment.amount,
    } : null,
  }
}

/* GET /api/orders */
router.get('/', async (req, res, next) => {
  try {
    const { slot, status } = req.query
    const filter = {}
    if (slot && slot !== 'all') filter.slot = slot
    if (status) filter.status = status
    const list = await Order.find(filter).sort({ createdAt: -1 })
    const payments = await Payment.find({ order: { $in: list.map(o => o._id) } })
    const payMap = {}
    payments.forEach(p => { payMap[p.order.toString()] = p })
    res.json(list.map(o => toClientOrder(o, payMap[o._id.toString()])))
  } catch (e) { next(e) }
})

/* POST /api/orders */
router.post('/', async (req, res, next) => {
  try {
    const { slot, items: lines } = req.body

    if (!slot || !['breakfast', 'lunch', 'dinner'].includes(slot))
      return res.status(400).json({ error: 'Invalid or missing slot' })

    if (!Array.isArray(lines) || lines.length === 0)
      return res.status(400).json({ error: 'items array is required' })

    const settings = await Settings.findOneAndUpdate(
      { _id: 'global' },
      { $setOnInsert: { workingDays: ['Monday','Tuesday','Wednesday','Thursday','Friday'], slotOpen: { breakfast: true, lunch: true, dinner: true } } },
      { upsert: true, new: true }
    )

    if (!isWorkingDayNow(settings.workingDays))
      return res.status(403).json({ error: 'Canteen is closed today' })

    if (!settings.slotOpen?.[slot])
      return res.status(403).json({ error: `Meal slot "${slot}" is not accepting orders` })

    const orderLines   = []
    const itemsSummary = []
    let   total        = 0

    for (const line of lines) {
      const { itemId, qty } = line
      if (!itemId || !mongoose.isValidObjectId(itemId) || !qty || qty < 1)
        return res.status(400).json({ error: 'Each item needs valid itemId and positive qty' })

      const menuDoc = await MenuItem.findById(itemId)
      if (!menuDoc || menuDoc.slot !== slot)
        return res.status(400).json({ error: `Invalid menu item for this slot: ${itemId}` })
      if (!menuDoc.active)
        return res.status(400).json({ error: `${menuDoc.name} is not available` })
      if (menuDoc.qty < qty)
        return res.status(400).json({ error: `Not enough stock for ${menuDoc.name}` })

      const lineTotal = menuDoc.price * qty
      total += lineTotal
      orderLines.push({ itemId: menuDoc._id, name: menuDoc.name, qty, unitPrice: menuDoc.price, lineTotal })
      itemsSummary.push(`${menuDoc.name} x${qty}`)
    }

    const counter = await Counter.findOneAndUpdate(
      { _id: 'global' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    )
    const token = `T${String(counter.seq).padStart(3, '0')}`

    const orderDoc = await Order.create({
      token, slot,
      items: itemsSummary.join(', '),
      lines: orderLines,
      total,
      status:        'Pending',
      paymentStatus: 'Unpaid',
    })

    /* create payment record immediately — status Initiated */
    const paymentDoc = await Payment.create({
      order:  orderDoc._id,
      token,
      amount: total,
      method: 'UPI',
      status: 'Initiated',
      upiId:  settings.upiId || UPI_ID,
    })

    /* link payment to order */
    orderDoc.payment = paymentDoc._id
    await orderDoc.save()

    for (const ol of orderLines) {
      await MenuItem.updateOne({ _id: ol.itemId }, { $inc: { qty: -ol.qty } })
    }

    res.status(201).json(toClientOrder(orderDoc, paymentDoc))
  } catch (e) { next(e) }
})

/* PATCH /api/orders/:token/payment — student confirms payment after GPay */
router.patch('/:token/payment', async (req, res, next) => {
  try {
    const { txnRef, payerUpiId, status } = req.body
    const payStatus = status === 'Failed' ? 'Failed' : 'Paid'

    const order = await Order.findOne({ token: req.params.token })
    if (!order) return res.status(404).json({ error: 'Order not found' })

    const payment = await Payment.findOneAndUpdate(
      { order: order._id },
      {
        status:     payStatus,
        txnRef:     txnRef     || '',
        payerUpiId: payerUpiId || '',
        paidAt:     payStatus === 'Paid' ? new Date() : null,
      },
      { new: true }
    )

    /* update order paymentStatus */
    order.paymentStatus = payStatus
    await order.save()

    res.json({ ok: true, payment })
  } catch (e) { next(e) }
})

/* PATCH /api/orders/:token — mark as Served */
router.patch('/:token', async (req, res, next) => {
  try {
    const { status } = req.body
    if (status !== 'Served')
      return res.status(400).json({ error: 'Only status "Served" is supported' })

    const doc = await Order.findOneAndUpdate(
      { token: req.params.token },
      { status: 'Served', servedAt: new Date() },
      { new: true }
    )
    if (!doc) return res.status(404).json({ error: 'Order not found' })

    const payment = await Payment.findOne({ order: doc._id })
    res.json(toClientOrder(doc, payment))
  } catch (e) { next(e) }
})

export default router
