import { Router } from 'express'
import mongoose from 'mongoose'
import { MenuItem } from '../db.js'
import { getCurrentSlotId } from '../utils/slots.js'

const router = Router()

function toClientItem(o) {
  return {
    id: (o._id ?? o.id)?.toString?.() ?? String(o.id),
    slot: o.slot,
    name: o.name,
    price: o.price,
    qty: o.qty,
    active: o.active,
    img: o.img,
    tag: o.tag || null,
    tagColor: o.tagColor || '',
    desc: o.desc || '',
  }
}

router.get('/', async (req, res, next) => {
  try {
    const { slot } = req.query
    const filter = {}
    if (slot && ['breakfast', 'lunch', 'dinner'].includes(slot)) filter.slot = slot
    const items = await MenuItem.find(filter).sort({ createdAt: 1 }).lean()
    if (slot) {
      return res.json(items.map((o) => toClientItem(o)))
    }
    const grouped = { breakfast: [], lunch: [], dinner: [] }
    for (const o of items) {
      const c = toClientItem(o)
      if (grouped[o.slot]) grouped[o.slot].push(c)
    }
    res.json(grouped)
  } catch (e) {
    next(e)
  }
})

router.get('/shop', async (req, res, next) => {
  try {
    let slot = req.query.slot
    if (!slot || slot === 'auto') {
      slot = getCurrentSlotId()
    } else if (!['breakfast', 'lunch', 'dinner'].includes(slot)) {
      return res.status(400).json({ error: 'Invalid slot' })
    }
    if (!slot) {
      return res.json({
        slot: null,
        items: [],
        message: 'No meal window is active right now. Try again during breakfast, lunch, or dinner.',
      })
    }
    const items = await MenuItem.find({ slot, active: true, qty: { $gt: 0 } }).sort({ createdAt: 1 }).lean()
    res.json({
      slot,
      items: items.map((o) => toClientItem(o)),
    })
  } catch (e) {
    next(e)
  }
})

router.post('/', async (req, res, next) => {
  try {
    const { slot, name, price, qty, active, img, tag, tagColor, desc } = req.body
    if (!slot || !['breakfast', 'lunch', 'dinner'].includes(slot)) {
      return res.status(400).json({ error: 'Invalid or missing slot' })
    }
    if (!name || price == null || qty == null) {
      return res.status(400).json({ error: 'name, price, and qty are required' })
    }
    const doc = await MenuItem.create({
      slot,
      name: String(name),
      price: Number(price),
      qty: Number(qty),
      active: active !== false,
      img: img || '',
      tag: tag || null,
      tagColor: tagColor || '',
      desc: desc || '',
    })
    res.status(201).json(toClientItem(doc.toObject()))
  } catch (e) {
    next(e)
  }
})

router.patch('/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid id' })
    }
    const allowed = ['name', 'price', 'qty', 'active', 'img', 'slot', 'tag', 'tagColor', 'desc']
    const patch = {}
    for (const k of allowed) {
      if (k in req.body) patch[k] = req.body[k]
    }
    if (patch.slot && !['breakfast', 'lunch', 'dinner'].includes(patch.slot)) {
      return res.status(400).json({ error: 'Invalid slot' })
    }
    const doc = await MenuItem.findByIdAndUpdate(id, patch, { new: true })
    if (!doc) return res.status(404).json({ error: 'Menu item not found' })
    res.json(toClientItem(doc.toObject()))
  } catch (e) {
    next(e)
  }
})

router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid id' })
    }
    const doc = await MenuItem.findByIdAndDelete(id)
    if (!doc) return res.status(404).json({ error: 'Menu item not found' })
    res.status(204).send()
  } catch (e) {
    next(e)
  }
})

export default router
