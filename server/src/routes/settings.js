import { Router } from 'express'
import { getSettings, updateSettings } from '../db/repositories/settingsRepo.js'

const router = Router()

/* GET /api/settings */
router.get('/', async (req, res, next) => {
  try {
    const settings = await getSettings()
    res.json({
      workingDays: settings.workingDays,
      slotOpen: settings.slotOpen,
      canteenName: settings.canteenName,
      upiId: settings.upiId,
    })
  } catch (e) {
    next(e)
  }
})

/* PATCH /api/settings */
router.patch('/', async (req, res, next) => {
  try {
    const updated = await updateSettings(req.body)
    res.json({
      workingDays: updated.workingDays,
      slotOpen: updated.slotOpen,
      canteenName: updated.canteenName,
      upiId: updated.upiId,
    })
  } catch (e) {
    next(e)
  }
})

export default router
