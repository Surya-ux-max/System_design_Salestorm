import { Router } from 'express'
import { Settings } from '../db.js'

const router = Router()

router.get('/', async (req, res, next) => {
  try {
    let doc = await Settings.findById('global')
    if (!doc) {
      doc = await Settings.create({
        _id: 'global',
        workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        slotOpen: { breakfast: true, lunch: true, dinner: true },
      })
    }
    res.json({
      workingDays: doc.workingDays,
      slotOpen: doc.slotOpen,
    })
  } catch (e) {
    next(e)
  }
})

router.patch('/', async (req, res, next) => {
  try {
    let doc = await Settings.findById('global')
    if (!doc) {
      doc = new Settings({
        _id: 'global',
        workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        slotOpen: { breakfast: true, lunch: true, dinner: true },
      })
    }
    if (Array.isArray(req.body.workingDays)) {
      doc.workingDays = req.body.workingDays
    }
    if (req.body.slotOpen && typeof req.body.slotOpen === 'object') {
      doc.slotOpen = {
        breakfast: req.body.slotOpen.breakfast !== false,
        lunch: req.body.slotOpen.lunch !== false,
        dinner: req.body.slotOpen.dinner !== false,
      }
    }
    await doc.save()
    res.json({
      workingDays: doc.workingDays,
      slotOpen: doc.slotOpen,
    })
  } catch (e) {
    next(e)
  }
})

export default router
