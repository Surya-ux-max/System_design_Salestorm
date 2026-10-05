import { processOutboxBatch } from '../services/outboxService.js'

let isRunning = false
let timer = null

export function startOutboxWorker(intervalMs = 3000) {
  if (isRunning) return
  isRunning = true

  async function tick() {
    try {
      await processOutboxBatch(25)
    } catch (err) {
      console.error('[OutboxWorker] Error processing outbox batch:', err)
    } finally {
      if (isRunning) {
        timer = setTimeout(tick, intervalMs)
      }
    }
  }

  tick()
  console.log(`📨 Outbox worker started (polling every ${intervalMs}ms)`)
}

export function stopOutboxWorker() {
  isRunning = false
  if (timer) clearTimeout(timer)
}
