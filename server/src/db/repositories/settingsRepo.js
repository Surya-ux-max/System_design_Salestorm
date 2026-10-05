import { query } from '../pool.js'

export async function getSettings() {
  const { rows } = await query('SELECT * FROM settings WHERE id = $1 LIMIT 1', ['global'])
  if (rows.length > 0) {
    const s = rows[0]
    return {
      id: s.id,
      workingDays: s.working_days,
      slotOpen: s.slot_open,
      canteenName: s.canteen_name,
      upiId: s.upi_id,
      openMessage: s.open_message,
      closeMessage: s.close_message,
    }
  }

  // Create default if not present
  const defaultWorkingDays = JSON.stringify(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'])
  const defaultSlotOpen = JSON.stringify({ breakfast: true, lunch: true, dinner: true })

  const created = await query(
    `INSERT INTO settings (id, working_days, slot_open, canteen_name, upi_id, open_message, close_message, created_at, updated_at)
     VALUES ('global', $1::jsonb, $2::jsonb, 'SECE Canteen', 'surprakas14@okaxis', 'Open · Serving Now', 'Closed Today', NOW(), NOW())
     ON CONFLICT (id) DO UPDATE SET updated_at = NOW()
     RETURNING *`,
    [defaultWorkingDays, defaultSlotOpen]
  )

  const s = created.rows[0]
  return {
    id: s.id,
    workingDays: s.working_days,
    slotOpen: s.slot_open,
    canteenName: s.canteen_name,
    upiId: s.upi_id,
    openMessage: s.open_message,
    closeMessage: s.close_message,
  }
}

export async function updateSettings(fields) {
  const current = await getSettings()
  const newWorkingDays = Array.isArray(fields.workingDays) ? fields.workingDays : current.workingDays
  const newSlotOpen =
    fields.slotOpen && typeof fields.slotOpen === 'object'
      ? {
          breakfast: fields.slotOpen.breakfast !== false,
          lunch: fields.slotOpen.lunch !== false,
          dinner: fields.slotOpen.dinner !== false,
        }
      : current.slotOpen

  const canteenName = fields.canteenName || current.canteenName
  const upiId = fields.upiId || current.upiId
  const openMessage = fields.openMessage || current.openMessage
  const closeMessage = fields.closeMessage || current.closeMessage

  const { rows } = await query(
    `UPDATE settings
     SET working_days = $1::jsonb,
         slot_open = $2::jsonb,
         canteen_name = $3,
         upi_id = $4,
         open_message = $5,
         close_message = $6,
         updated_at = NOW()
     WHERE id = 'global'
     RETURNING *`,
    [
      JSON.stringify(newWorkingDays),
      JSON.stringify(newSlotOpen),
      canteenName,
      upiId,
      openMessage,
      closeMessage,
    ]
  )

  const s = rows[0]
  return {
    id: s.id,
    workingDays: s.working_days,
    slotOpen: s.slot_open,
    canteenName: s.canteen_name,
    upiId: s.upi_id,
    openMessage: s.open_message,
    closeMessage: s.close_message,
  }
}
