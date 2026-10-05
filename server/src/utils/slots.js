export const MEAL_SLOTS = [
  { id: 'breakfast', start: '07:00', end: '10:00' },
  { id: 'lunch', start: '11:00', end: '14:30' },
  { id: 'dinner', start: '17:00', end: '20:00' },
]

export function getCurrentSlotId() {
  const now = new Date()
  const m = now.getHours() * 60 + now.getMinutes()
  for (const slot of MEAL_SLOTS) {
    const [sh, sm] = slot.start.split(':').map(Number)
    const [eh, em] = slot.end.split(':').map(Number)
    const start = sh * 60 + sm
    const end = eh * 60 + em
    if (m >= start && m <= end) return slot.id
  }
  return null
}

export function isWorkingDayNow(workingDays) {
  const day = new Date().toLocaleDateString('en-IN', { weekday: 'long' })
  return workingDays.includes(day)
}
