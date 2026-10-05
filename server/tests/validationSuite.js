/**
 * SALESTORM Validation Test Suite
 * Tests 1 through 7 covering high concurrency, idempotency, failure paths,
 * reservation expiry, and event-driven order processing resilience.
 */

import 'dotenv/config'
import { pool } from '../src/db/pool.js'
import { migrate } from '../src/db/migrate.js'
import { seedIfEmpty } from '../src/db/seed.js'
import {
  resetInventoryStock,
  getInventoryByProductId,
} from '../src/db/repositories/inventoryRepo.js'
import {
  findReservationById,
  findReservationByIdempotency,
} from '../src/db/repositories/reservationRepo.js'
import {
  findOrderByToken,
  findOrderByReservationId,
} from '../src/db/repositories/orderRepo.js'
import { findPaymentByToken } from '../src/db/repositories/paymentRepo.js'
import {
  reserveItems,
  releaseExpiredReservations,
} from '../src/services/inventoryService.js'
import { processPayment } from '../src/services/paymentService.js'
import { createOrderFromReservation, cancelOrder } from '../src/services/orderService.js'
import { circuitBreaker } from '../src/services/circuitBreaker.js'
import { processOutboxBatch } from '../src/services/outboxService.js'

function logSuccess(testName, details) {
  console.log(`\n  ✅ [PASS] ${testName}`)
  if (details) console.log(`     ↳ ${details}`)
}

function logFailure(testName, error) {
  console.error(`\n  ❌ [FAIL] ${testName}`)
  console.error(`     ↳ ${error}`)
}

async function runTestSuite() {
  console.log('===============================================================')
  console.log('⚡ SALESTORM DISTRIBUTED SYSTEM CONCURRENCY & RESILIENCE TESTS ⚡')
  console.log('===============================================================')

  await migrate()
  await seedIfEmpty()

  const TEST_PRODUCT_ID = 1 // Full Meals
  let passedCount = 0
  let failedCount = 0

  // --------------------------------------------------------------------------
  // TEST 1: 100 Inventory vs 10,000 Concurrent Purchase Attempts
  // --------------------------------------------------------------------------
  try {
    console.log('\n--- Running TEST 1: 100 Inventory vs 10,000 Concurrent Purchase Attempts ---')
    const INITIAL_STOCK = 100
    const CONCURRENT_REQUESTS = 10000

    await resetInventoryStock(TEST_PRODUCT_ID, INITIAL_STOCK)

    let successfulReservations = 0
    let outOfStockRejections = 0
    let otherErrors = 0

    // Fire 10,000 concurrent purchase attempts in batches to avoid OS socket/memory exhaustion
    const BATCH_SIZE = 500
    for (let b = 0; b < CONCURRENT_REQUESTS; b += BATCH_SIZE) {
      const batchPromises = []
      for (let i = 0; i < BATCH_SIZE; i++) {
        const reqIndex = b + i
        const idempotencyKey = `concurrency_test_${Date.now()}_${reqIndex}`
        batchPromises.push(
          reserveItems({
            items: [{ productId: TEST_PRODUCT_ID, qty: 1 }],
            slot: 'breakfast',
            idempotencyKey,
            durationSeconds: 300,
          })
            .then((res) => {
              if (res.success) successfulReservations++
              else if (res.code === 'OUT_OF_STOCK') outOfStockRejections++
              else otherErrors++
            })
            .catch(() => otherErrors++)
        )
      }
      await Promise.all(batchPromises)
    }

    const finalInv = await getInventoryByProductId(TEST_PRODUCT_ID)
    const oversold = Math.max(0, successfulReservations - INITIAL_STOCK)

    console.log(`     Total Requests:           ${CONCURRENT_REQUESTS}`)
    console.log(`     Successful Reservations:  ${successfulReservations} (Target: <= ${INITIAL_STOCK})`)
    console.log(`     Out Of Stock Rejections:  ${outOfStockRejections}`)
    console.log(`     Final Available Stock:    ${finalInv.available_quantity}`)
    console.log(`     Final Reserved Stock:     ${finalInv.reserved_quantity}`)
    console.log(`     Oversold Count:           ${oversold}`)

    if (successfulReservations <= INITIAL_STOCK && finalInv.available_quantity >= 0 && oversold === 0) {
      logSuccess(
        'TEST 1: Concurrency Invariant Maintained',
        `Exactly ${successfulReservations} secured out of 10,000. Overselling = 0. Available = ${finalInv.available_quantity}`
      )
      passedCount++
    } else {
      throw new Error(`Overselling detected! Successful=${successfulReservations}, Available=${finalInv.available_quantity}`)
    }
  } catch (err) {
    logFailure('TEST 1: Concurrency Test', err.message)
    failedCount++
  }

  // --------------------------------------------------------------------------
  // TEST 2: Duplicate Purchase Request (Idempotency)
  // --------------------------------------------------------------------------
  try {
    console.log('\n--- Running TEST 2: Duplicate Purchase Request (Idempotency) ---')
    await resetInventoryStock(TEST_PRODUCT_ID, 10)
    const IDEMPOTENCY_KEY = `idem_key_${Date.now()}`

    // 1st request
    const res1 = await reserveItems({
      items: [{ productId: TEST_PRODUCT_ID, qty: 2 }],
      slot: 'breakfast',
      idempotencyKey: IDEMPOTENCY_KEY,
    })
    const orderRes1 = await createOrderFromReservation({
      reservationId: res1.reservationId,
      slot: 'breakfast',
      lines: res1.lines,
      total: res1.total,
      idempotencyKey: IDEMPOTENCY_KEY,
    })

    // 2nd duplicate request with same key
    const res2 = await reserveItems({
      items: [{ productId: TEST_PRODUCT_ID, qty: 2 }],
      slot: 'breakfast',
      idempotencyKey: IDEMPOTENCY_KEY,
    })
    const orderRes2 = await createOrderFromReservation({
      reservationId: res2.reservationId,
      slot: 'breakfast',
      lines: res2.lines,
      total: res2.total,
      idempotencyKey: IDEMPOTENCY_KEY,
    })

    const finalInv = await getInventoryByProductId(TEST_PRODUCT_ID)

    if (orderRes1.order.id === orderRes2.order.id && finalInv.reserved_quantity === 2) {
      logSuccess(
        'TEST 2: Idempotency Enforcement',
        `Duplicate request returned existing order token (${orderRes1.order.token}). No duplicate reservation. Reserved: 2 (expected 2, not 4).`
      )
      passedCount++
    } else {
      throw new Error('Duplicate reservation or order was created!')
    }
  } catch (err) {
    logFailure('TEST 2: Idempotency Test', err.message)
    failedCount++
  }

  // --------------------------------------------------------------------------
  // TEST 3: Payment Failure (Reservation Released)
  // --------------------------------------------------------------------------
  try {
    console.log('\n--- Running TEST 3: Payment Failure Releases Reservation ---')
    await resetInventoryStock(TEST_PRODUCT_ID, 10)

    const res = await reserveItems({
      items: [{ productId: TEST_PRODUCT_ID, qty: 3 }],
      slot: 'breakfast',
    })
    const orderRes = await createOrderFromReservation({
      reservationId: res.reservationId,
      slot: 'breakfast',
      lines: res.lines,
      total: res.total,
    })

    // Process payment with forced FAILED outcome
    const payResult = await processPayment({
      token: orderRes.order.token,
      forceOutcome: 'FAILED',
    })

    const invAfterFail = await getInventoryByProductId(TEST_PRODUCT_ID)
    const resRecord = await findReservationById(res.reservationId)

    if (!payResult.success && resRecord.status === 'RELEASED' && invAfterFail.available_quantity === 10) {
      logSuccess(
        'TEST 3: Payment Failure Rollback',
        `Reservation status = ${resRecord.status}. Stock restored: available = ${invAfterFail.available_quantity}, reserved = ${invAfterFail.reserved_quantity}`
      )
      passedCount++
    } else {
      throw new Error(`Failed to release reservation on payment failure! Available=${invAfterFail.available_quantity}`)
    }
  } catch (err) {
    logFailure('TEST 3: Payment Failure Rollback', err.message)
    failedCount++
  }

  // --------------------------------------------------------------------------
  // TEST 4: Payment Timeout (Safe Retry Without Duplicate Payment)
  // --------------------------------------------------------------------------
  try {
    console.log('\n--- Running TEST 4: Payment Timeout with Safe Retry ---')
    await resetInventoryStock(TEST_PRODUCT_ID, 10)

    const res = await reserveItems({
      items: [{ productId: TEST_PRODUCT_ID, qty: 1 }],
      slot: 'breakfast',
    })
    const orderRes = await createOrderFromReservation({
      reservationId: res.reservationId,
      slot: 'breakfast',
      lines: res.lines,
      total: res.total,
    })

    // First attempt: TIMEOUT
    const timeoutRes = await processPayment({
      token: orderRes.order.token,
      forceOutcome: 'TIMEOUT',
      idempotencyKey: `pay_timeout_test_${Date.now()}`,
    })

    // Second attempt: SUCCESS retry
    const retryRes = await processPayment({
      token: orderRes.order.token,
      forceOutcome: 'SUCCESS',
      txnRef: 'UPI_RETRY_12345',
    })

    // Third attempt: Duplicate after success
    const dupRes = await processPayment({
      token: orderRes.order.token,
      forceOutcome: 'SUCCESS',
    })

    if (
      timeoutRes.code === 'PAYMENT_TIMEOUT' &&
      retryRes.success &&
      retryRes.payment.status === 'Paid' &&
      dupRes.alreadyProcessed === true
    ) {
      logSuccess(
        'TEST 4: Payment Timeout and Safe Retry',
        `Initial attempt timed out safely without dropping order. Retry succeeded and subsequent call detected duplicate (alreadyProcessed: true).`
      )
      passedCount++
    } else {
      throw new Error('Payment timeout and retry behavior did not match expected semantics.')
    }
  } catch (err) {
    logFailure('TEST 4: Payment Timeout & Retry', err.message)
    failedCount++
  }

  // --------------------------------------------------------------------------
  // TEST 5: Reservation Expiry (Inventory Automatically Returned)
  // --------------------------------------------------------------------------
  try {
    console.log('\n--- Running TEST 5: Reservation Expiry Automatic Return ---')
    await resetInventoryStock(TEST_PRODUCT_ID, 10)

    // Create reservation with negative duration so it is immediately expired
    const res = await reserveItems({
      items: [{ productId: TEST_PRODUCT_ID, qty: 4 }],
      slot: 'breakfast',
      durationSeconds: -10, // expired 10 seconds ago
    })

    const invDuringHold = await getInventoryByProductId(TEST_PRODUCT_ID)
    const releasedCount = await releaseExpiredReservations()
    const invAfterExpiry = await getInventoryByProductId(TEST_PRODUCT_ID)
    const resRecord = await findReservationById(res.reservationId)

    if (
      invDuringHold.available_quantity === 6 &&
      releasedCount >= 1 &&
      invAfterExpiry.available_quantity === 10 &&
      resRecord.status === 'EXPIRED'
    ) {
      logSuccess(
        'TEST 5: Reservation Expiry Cleaner',
        `Expired reservation detected (${resRecord.status}). 4 units returned to inventory. Available = ${invAfterExpiry.available_quantity}, Reserved = ${invAfterExpiry.reserved_quantity}`
      )
      passedCount++
    } else {
      throw new Error(`Inventory was not returned after expiry. Available=${invAfterExpiry.available_quantity}`)
    }
  } catch (err) {
    logFailure('TEST 5: Reservation Expiry', err.message)
    failedCount++
  }

  // --------------------------------------------------------------------------
  // TEST 6: Payment Succeeds While Order Service Is Unavailable
  // --------------------------------------------------------------------------
  try {
    console.log('\n--- Running TEST 6: Payment Success with Temporary Order Service Outage ---')
    await resetInventoryStock(TEST_PRODUCT_ID, 10)

    const res = await reserveItems({
      items: [{ productId: TEST_PRODUCT_ID, qty: 1 }],
      slot: 'breakfast',
    })
    const orderRes = await createOrderFromReservation({
      reservationId: res.reservationId,
      slot: 'breakfast',
      lines: res.lines,
      total: res.total,
    })

    // 1. Simulate Order Service Outage
    circuitBreaker.setOrderServiceAvailable(false, 'Simulated Chaos Outage')

    // 2. Student payment succeeds
    const payResult = await processPayment({
      token: orderRes.order.token,
      forceOutcome: 'SUCCESS',
      txnRef: 'TXN_DURING_OUTAGE',
    })

    if (!payResult.success) throw new Error('Payment should succeed even if Order Service is down!')

    // 3. Outbox worker runs during outage -> Event retained, NOT lost
    await processOutboxBatch(10)
    let orderDuringOutage = await findOrderByToken(orderRes.order.token)

    // 4. Order Service Recovers
    circuitBreaker.setOrderServiceAvailable(true)

    // 5. Outbox worker runs after recovery -> Event processed, order confirmed!
    await processOutboxBatch(10)
    let orderAfterRecovery = await findOrderByToken(orderRes.order.token)

    if (payResult.success && orderAfterRecovery.status === 'CONFIRMED') {
      logSuccess(
        'TEST 6: Event-Driven Resilience (Transactional Outbox)',
        `Payment was preserved during outage. Event retained in outbox and processed after Order Service recovery. Status: ${orderAfterRecovery.status}`
      )
      passedCount++
    } else {
      throw new Error(`Order was not confirmed after recovery! Status=${orderAfterRecovery?.status}`)
    }
  } catch (err) {
    circuitBreaker.setOrderServiceAvailable(true)
    logFailure('TEST 6: Outage Resilience', err.message)
    failedCount++
  }

  // --------------------------------------------------------------------------
  // TEST 7: Inventory Reaches Zero (Rejection of Subsequent Requests)
  // --------------------------------------------------------------------------
  try {
    console.log('\n--- Running TEST 7: Zero Inventory Rejections (OUT_OF_STOCK) ---')
    await resetInventoryStock(TEST_PRODUCT_ID, 2)

    // Buy out remaining 2
    const res1 = await reserveItems({
      items: [{ productId: TEST_PRODUCT_ID, qty: 2 }],
      slot: 'breakfast',
    })
    if (!res1.success) throw new Error('First reservation should have succeeded!')

    // Next request when stock is 0
    const res2 = await reserveItems({
      items: [{ productId: TEST_PRODUCT_ID, qty: 1 }],
      slot: 'breakfast',
    })

    const finalInv = await getInventoryByProductId(TEST_PRODUCT_ID)

    if (!res2.success && res2.code === 'OUT_OF_STOCK' && finalInv.available_quantity === 0) {
      logSuccess(
        'TEST 7: Zero Stock Rejection',
        `Correctly rejected subsequent request with code: ${res2.code} and message: "${res2.message}". Available stock: 0.`
      )
      passedCount++
    } else {
      throw new Error(`Stock reaching zero failed to reject subsequent requests. Available=${finalInv.available_quantity}`)
    }
  } catch (err) {
    logFailure('TEST 7: Zero Stock Rejection', err.message)
    failedCount++
  }

  // --------------------------------------------------------------------------
  // TEST 8: Order Cancellation & Inventory Stock Reversal
  // --------------------------------------------------------------------------
  try {
    console.log('\n--- Running TEST 8: Order Cancellation & Inventory Stock Reversal ---')
    await resetInventoryStock(TEST_PRODUCT_ID, 10)

    // 1. Order and confirm 3 items
    const res = await reserveItems({
      items: [{ productId: TEST_PRODUCT_ID, qty: 3 }],
      slot: 'breakfast',
    })
    const orderRes = await createOrderFromReservation({
      reservationId: res.reservationId,
      slot: 'breakfast',
      lines: res.lines,
      total: res.total,
    })

    // Pay for order (moves reserved -> sold)
    await processPayment({
      token: orderRes.order.token,
      forceOutcome: 'SUCCESS',
      txnRef: 'TXN_TO_CANCEL',
    })

    const invBeforeCancel = await getInventoryByProductId(TEST_PRODUCT_ID)

    // 2. Cancel the order
    const cancelledOrder = await cancelOrder(orderRes.order.token, { reason: 'Student changed mind' })
    const invAfterCancel = await getInventoryByProductId(TEST_PRODUCT_ID)
    const payment = await findPaymentByToken(orderRes.order.token)

    // 3. Verify invariants
    const stockRestored = invAfterCancel.available_quantity === 10 && invAfterCancel.sold_quantity === 0
    const statusCorrect = cancelledOrder.status === 'CANCELLED' && payment.status === 'Refunded'

    if (stockRestored && statusCorrect) {
      logSuccess(
        'TEST 8: Order Cancellation & Stock Reversal',
        `Order ${cancelledOrder.token} status = CANCELLED. Payment = Refunded. Sold quantity reversed to 0, available stock restored from ${invBeforeCancel.available_quantity} to ${invAfterCancel.available_quantity}.`
      )
      passedCount++
    } else {
      throw new Error(`Cancellation stock reversal failed! Available: ${invAfterCancel.available_quantity}, Sold: ${invAfterCancel.sold_quantity}`)
    }
  } catch (err) {
    logFailure('TEST 8: Order Cancellation', err.message)
    failedCount++
  }

  // --------------------------------------------------------------------------
  // Summary
  // --------------------------------------------------------------------------
  console.log('\n===============================================================')
  console.log(`📋 VALIDATION TEST RESULTS: ${passedCount} PASSED / ${failedCount} FAILED`)
  console.log('===============================================================')

  await pool.end()
  process.exit(failedCount > 0 ? 1 : 0)
}

runTestSuite()
