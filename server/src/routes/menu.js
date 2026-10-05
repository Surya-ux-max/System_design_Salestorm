import { Router } from 'express'
import {
  getMenuItems,
  getShopMenuItems,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
} from '../db/repositories/menuRepo.js'
import { getCurrentSlotId } from '../utils/slots.js'

const router = Router()

/* GET /api/menu */
router.get('/', async (req, res, next) => {
  try {
    const { slot } = req.query
    const result = await getMenuItems(slot)
    res.json(result)
  } catch (e) {
    next(e)
  }
})

/* GET /api/menu/shop */
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

    const items = await getShopMenuItems(slot)
    res.json({
      slot,
      items,
    })
  } catch (e) {
    next(e)
  }
})

/* POST /api/menu */
router.post('/', async (req, res, next) => {
  try {
    const { slot, name, price, qty, active, img, tag, tagColor, desc } = req.body
    if (!slot || !['breakfast', 'lunch', 'dinner'].includes(slot)) {
      return res.status(400).json({ error: 'Invalid or missing slot' })
    }
    if (!name || price == null || qty == null) {
      return res.status(400).json({ error: 'name, price, and qty are required' })
    }

    const item = await createMenuItem({
      slot,
      name,
      price,
      qty,
      active,
      img,
      tag,
      tagColor,
      desc,
    })

    res.status(201).json(item)
  } catch (e) {
    next(e)
  }
})

/* PATCH /api/menu/:id */
router.patch('/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    const parsedId = Number(id)
    if (isNaN(parsedId)) {
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

    const doc = await updateMenuItem(parsedId, patch)
    if (!doc) return res.status(404).json({ error: 'Menu item not found' })
    res.json(doc)
  } catch (e) {
    next(e)
  }
})

/* DELETE /api/menu/:id */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    const parsedId = Number(id)
    if (isNaN(parsedId)) {
      return res.status(400).json({ error: 'Invalid id' })
    }

    const doc = await deleteMenuItem(parsedId)
    if (!doc) return res.status(404).json({ error: 'Menu item not found' })
    res.status(204).send()
  } catch (e) {
    next(e)
  }
})

export default router
