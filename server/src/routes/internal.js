import { Router } from 'express'
import { query } from '../db/pool.js'
import { getAllInventory, resetInventoryStock, getInventoryByProductId } from '../db/repositories/inventoryRepo.js'
import { reserveItems, releaseExpiredReservations } from '../services/inventoryService.js'
import { processPayment, setPaymentSimulationConfig, getPaymentSimulationConfig } from '../services/paymentService.js'
import { createOrderFromReservation } from '../services/orderService.js'
import { circuitBreaker } from '../services/circuitBreaker.js'
import { processOutboxBatch } from '../services/outboxService.js'

const router = Router()

/* GET /api/internal/health — internal diagnostics */
router.get('/health', async (_, res) => {
  try {
    const inv = await getAllInventory()
    const outboxCount = await query("SELECT COUNT(*)::int AS count FROM outbox_events WHERE status = 'PENDING'")
    const deadLetterCount = await query("SELECT COUNT(*)::int AS count FROM outbox_events WHERE status = 'DEAD_LETTER'")

    res.json({
      status: 'OK',
      circuitBreaker: circuitBreaker.getStatus(),
      paymentSimulation: getPaymentSimulationConfig(),
      pendingOutboxEvents: outboxCount.rows[0].count,
      deadLetterEvents: deadLetterCount.rows[0].count,
      inventorySummary: inv.map((i) => ({
        id: i.product_id,
        name: i.product_name,
        available: i.available_quantity,
        reserved: i.reserved_quantity,
        sold: i.sold_quantity,
        version: i.version,
      })),
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/* POST /api/internal/circuit-breaker — toggle order service availability */
router.post('/circuit-breaker', (req, res) => {
  const { available, reason } = req.body
  circuitBreaker.setOrderServiceAvailable(available !== false, reason)
  res.json({ ok: true, status: circuitBreaker.getStatus() })
})

/* POST /api/internal/payment-sim — configure payment simulation */
router.post('/payment-sim', (req, res) => {
  setPaymentSimulationConfig(req.body)
  res.json({ ok: true, config: getPaymentSimulationConfig() })
})

/* POST /api/internal/reset-inventory — reset stock for a product for testing */
router.post('/reset-inventory', async (req, res) => {
  try {
    const { productId, quantity = 100 } = req.body
    if (!productId) return res.status(400).json({ error: 'productId is required' })

    const updated = await resetInventoryStock(productId, quantity)
    res.json({ ok: true, inventory: updated })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/* POST /api/internal/trigger-outbox — manually trigger outbox batch processing */
router.post('/trigger-outbox', async (req, res) => {
  try {
    const processed = await processOutboxBatch(req.body.batchSize || 50)
    res.json({ ok: true, processed })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/* POST /api/internal/trigger-expiry — manually trigger reservation expiry check */
router.post('/trigger-expiry', async (_, res) => {
  try {
    const released = await releaseExpiredReservations()
    res.json({ ok: true, released })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/* POST /api/internal/simulate-sale — High Concurrency Test Runner (Requirement 11) */
router.post('/simulate-sale', async (req, res) => {
  const {
    productId = 1,
    initialInventory = 100,
    concurrentRequests = 1000, // Configurable batch size
    slot = 'breakfast',
  } = req.body

  console.log(`\n🚀 [FlashSaleTest] Starting simulation: ${concurrentRequests} concurrent attempts for product ${productId} (initial stock = ${initialInventory})`)

  try {
    // 1. Reset inventory to initial test state
    await resetInventoryStock(productId, initialInventory)

    // 2. Prepare concurrent purchase requests
    const results = {
      totalRequests: concurrentRequests,
      successfulReservations: 0,
      outOfStockRejections: 0,
      errors: 0,
      oversold: 0,
    }

    const promises = []
    for (let i = 0; i < concurrentRequests; i++) {
      const p = (async (index) => {
        try {
          const idempotencyKey = `sim_${Date.now()}_req_${index}`
          const reserveRes = await reserveItems({
            items: [{ productId, qty: 1 }],
            slot,
            idempotencyKey,
            durationSeconds: 300,
          })

          if (reserveRes.success) {
            results.successfulReservations++
          } else if (reserveRes.code === 'OUT_OF_STOCK') {
            results.outOfStockRejections++
          } else {
            results.errors++
          }
        } catch {
          results.errors++
        }
      })(i)

      promises.push(p)
    }

    await Promise.all(promises)

    // 3. Verify Final Invariants
    const finalInventory = await getInventoryByProductId(productId)
    results.finalAvailable = finalInventory.available_quantity
    results.finalReserved = finalInventory.reserved_quantity
    results.finalSold = finalInventory.sold_quantity
    results.initialInventory = initialInventory
    results.oversold = results.successfulReservations > initialInventory ? results.successfulReservations - initialInventory : 0
    results.invariantHeld = finalInventory.available_quantity >= 0 && results.successfulReservations <= initialInventory

    console.log(`📊 [FlashSaleTest] Finished simulation. Result:`, results)
    res.json({ ok: true, results })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
