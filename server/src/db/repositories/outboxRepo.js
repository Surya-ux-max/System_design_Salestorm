import { query } from '../pool.js'

export async function createOutboxEvent({ eventId, eventType, payload }, dbClient = null) {
  const runner = dbClient || { query }
  const { rows } = await runner.query(
    `INSERT INTO outbox_events (event_id, event_type, payload, status, retry_count, created_at, updated_at)
     VALUES ($1, $2, $3::jsonb, 'PENDING', 0, NOW(), NOW())
     RETURNING *`,
    [eventId, eventType, JSON.stringify(payload)]
  )
  return rows[0]
}

export async function getPendingOutboxEvents(limit = 20, dbClient = null) {
  const runner = dbClient || { query }
  const { rows } = await runner.query(
    `SELECT * FROM outbox_events
     WHERE status IN ('PENDING', 'FAILED')
       AND retry_count < 5
     ORDER BY created_at ASC
     LIMIT $1
     FOR UPDATE SKIP LOCKED`,
    [Number(limit)]
  )
  return rows
}

export async function markOutboxEventProcessed(eventId, dbClient = null) {
  const runner = dbClient || { query }
  const { rows } = await runner.query(
    `UPDATE outbox_events
     SET status = 'PROCESSED', updated_at = NOW()
     WHERE event_id = $1
     RETURNING *`,
    [eventId]
  )
  return rows[0] || null
}

export async function recordOutboxEventFailure(eventId, errorMessage, dbClient = null) {
  const runner = dbClient || { query }
  const { rows } = await runner.query(
    `UPDATE outbox_events
     SET retry_count   = retry_count + 1,
         error_message = $1,
         status        = CASE WHEN retry_count + 1 >= 5 THEN 'DEAD_LETTER' ELSE 'FAILED' END,
         updated_at    = NOW()
     WHERE event_id = $2
     RETURNING *`,
    [errorMessage, eventId]
  )
  return rows[0] || null
}
