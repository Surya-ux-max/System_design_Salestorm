import { releaseExpiredReservations } from '../services/inventoryService.js'

let isRunning = false
let timer = null

export function startReservationExpiryWorker(intervalMs = 5000) {
  if (isRunning) return
  isRunning = true

  async function tick() {
    try {
      const released = await releaseExpiredReservations()
      if (released > 0) {
        console.log(`⏱️ [ReservationWorker] Released ${released} expired reservations back to inventory.`)
      }
    } catch (err) {
      console.error('[ReservationWorker] Error checking expired reservations:', err)
    } finally {
      if (isRunning) {
        timer = setTimeout(tick, intervalMs)
      }
    }
  }

  tick()
  console.log(`🔄 Reservation expiry worker started (polling every ${intervalMs}ms)`)
}

export function stopReservationExpiryWorker() {
  isRunning = false
  if (timer) clearTimeout(timer)
}
