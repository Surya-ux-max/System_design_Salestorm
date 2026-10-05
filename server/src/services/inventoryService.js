import { randomUUID } from 'crypto'
import { getClient } from '../db/pool.js'
import {
  lockAndReserveStock,
  confirmReservedStock,
  releaseReservedStock,
  getInventoryByProductId,
} from '../db/repositories/inventoryRepo.js'
import {
  createReservation,
  findReservationById,
  findReservationByIdempotency,
  updateReservationStatus,
  lockExpiredReservations,
} from '../db/repositories/reservationRepo.js'
import { findMenuItemById } from '../db/repositories/menuRepo.js'

export async function reserveItems({
  items,
  userId = null,
  slot = null,
  idempotencyKey = null,
  durationSeconds = 300, // 5 minutes reservation TTL
}) {
  // 1. Check idempotency for existing reservation
  if (idempotencyKey) {
    const existing = await findReservationByIdempotency(idempotencyKey)
    if (existing) {
      if (['RESERVED', 'PAYMENT_PENDING', 'CONFIRMED'].includes(existing.status)) {
        return {
          success: true,
          isDuplicate: true,
          reservation: existing,
          reservationId: existing.reservation_id,
        }
      }
    }
  }

  const client = await getClient()
  try {
    await client.query('BEGIN')

    const verifiedLines = []
    let computedTotal = 0
    const masterReservationId = `res_${randomUUID().replace(/-/g, '').slice(0, 16)}`
    const expiresAt = new Date(Date.now() + durationSeconds * 1000)

    let index = 0
    let primaryReservation = null

    for (const item of items) {
      const productId = Number(item.itemId || item.productId)
      const qty = Number(item.qty || item.quantity)

      if (isNaN(productId) || !qty || qty < 1) {
        throw new Error('Invalid item parameters for reservation')
      }

      // Check menu item validity
      const menuDoc = await findMenuItemById(productId, client)
      if (!menuDoc || !menuDoc.active) {
        await client.query('ROLLBACK')
        return {
          success: false,
          code: 'ITEM_UNAVAILABLE',
          message: `${menuDoc ? menuDoc.name : 'Item'} is currently unavailable`,
        }
      }

      if (slot && menuDoc.slot !== slot) {
        await client.query('ROLLBACK')
        return {
          success: false,
          code: 'INVALID_SLOT',
          message: `${menuDoc.name} is not served during ${slot}`,
        }
      }

      // Concurrency-safe lock: SELECT FOR UPDATE
      const reserveRes = await lockAndReserveStock(productId, qty, client)
      if (!reserveRes.success) {
        await client.query('ROLLBACK')
        return {
          success: false,
          code: 'OUT_OF_STOCK',
          message: `Sorry, ${menuDoc.name} is currently sold out`,
          details: { productId, available: reserveRes.available, requested: qty },
        }
      }

      const unitPrice = Number(menuDoc.price)
      const lineTotal = unitPrice * qty
      computedTotal += lineTotal

      verifiedLines.push({
        productId,
        itemId: productId,
        name: menuDoc.name,
        qty,
        unitPrice,
        lineTotal,
      })

      // Reservation ID for this item: masterReservationId (if single item) or master_0, master_1 (if multi-item)
      const itemResId = items.length === 1 ? masterReservationId : `${masterReservationId}_${index}`
      const itemKey = idempotencyKey ? (items.length === 1 ? idempotencyKey : `${idempotencyKey}_${index}`) : null

      const created = await createReservation(
        {
          reservationId: itemResId,
          productId,
          userId,
          quantity: qty,
          status: 'RESERVED',
          idempotencyKey: itemKey,
          expiresAt,
        },
        client
      )

      if (!primaryReservation) {
        primaryReservation = created
      }
      index++
    }

    await client.query('COMMIT')

    return {
      success: true,
      reservationId: masterReservationId,
      reservation: primaryReservation,
      lines: verifiedLines,
      total: computedTotal,
      expiresAt,
    }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export async function confirmReservation(reservationId, dbClient = null) {
  const runner = dbClient || (await getClient())
  const isOwnClient = !dbClient

  try {
    if (isOwnClient) await runner.query('BEGIN')

    const { rows: reservations } = await runner.query(
      `SELECT * FROM inventory_reservations 
       WHERE (reservation_id = $1 OR reservation_id LIKE $2)
         AND status IN ('RESERVED', 'PAYMENT_PENDING')
       FOR UPDATE`,
      [reservationId, `${reservationId}_%`]
    )

    if (reservations.length === 0) {
      if (isOwnClient) await runner.query('COMMIT')
      return false
    }

    for (const res of reservations) {
      await confirmReservedStock(res.product_id, res.quantity, runner)
      await updateReservationStatus(res.reservation_id, 'CONFIRMED', runner)
    }

    if (isOwnClient) await runner.query('COMMIT')
    return true
  } catch (err) {
    if (isOwnClient) await runner.query('ROLLBACK')
    throw err
  } finally {
    if (isOwnClient) runner.release()
  }
}

export async function releaseReservation(reservationId, reason = 'PAYMENT_FAILED', dbClient = null) {
  const runner = dbClient || (await getClient())
  const isOwnClient = !dbClient

  try {
    if (isOwnClient) await runner.query('BEGIN')

    const { rows: reservations } = await runner.query(
      `SELECT * FROM inventory_reservations 
       WHERE (reservation_id = $1 OR reservation_id LIKE $2)
         AND status IN ('RESERVED', 'PAYMENT_PENDING')
       FOR UPDATE`,
      [reservationId, `${reservationId}_%`]
    )

    for (const res of reservations) {
      await releaseReservedStock(res.product_id, res.quantity, runner)
      await updateReservationStatus(res.reservation_id, 'RELEASED', runner)
    }

    if (isOwnClient) await runner.query('COMMIT')
    return true
  } catch (err) {
    if (isOwnClient) await runner.query('ROLLBACK')
    throw err
  } finally {
    if (isOwnClient) runner.release()
  }
}

export async function releaseExpiredReservations() {
  const client = await getClient()
  let releasedCount = 0

  try {
    await client.query('BEGIN')

    const expiredRows = await lockExpiredReservations(50, client)
    for (const res of expiredRows) {
      await releaseReservedStock(res.product_id, res.quantity, client)
      await updateReservationStatus(res.reservation_id, 'EXPIRED', client)
      releasedCount++
    }

    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('Error in releaseExpiredReservations:', err)
  } finally {
    client.release()
  }

  return releasedCount
}
