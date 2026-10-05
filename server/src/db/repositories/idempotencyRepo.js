import { query } from '../pool.js'

export async function getIdempotencyRecord(key, dbClient = null) {
  if (!key) return null
  const runner = dbClient || { query }
  const { rows } = await runner.query(
    'SELECT * FROM idempotency_keys WHERE key = $1 LIMIT 1',
    [key]
  )
  return rows[0] || null
}

export async function startIdempotencyRecord(key, requestPath, requestParams = {}, dbClient = null) {
  if (!key) return null
  const runner = dbClient || { query }
  try {
    const { rows } = await runner.query(
      `INSERT INTO idempotency_keys (key, request_path, request_params, status, created_at, updated_at)
       VALUES ($1, $2, $3::jsonb, 'STARTED', NOW(), NOW())
       ON CONFLICT (key) DO NOTHING
       RETURNING *`,
      [key, requestPath, JSON.stringify(requestParams)]
    )
    return rows[0] || null
  } catch (err) {
    console.error('Error starting idempotency record:', err)
    return null
  }
}

export async function completeIdempotencyRecord(key, responseCode, responseBody, dbClient = null) {
  if (!key) return null
  const runner = dbClient || { query }
  const { rows } = await runner.query(
    `UPDATE idempotency_keys
     SET response_code = $1,
         response_body = $2::jsonb,
         status        = 'COMPLETED',
         updated_at    = NOW()
     WHERE key = $3
     RETURNING *`,
    [Number(responseCode), JSON.stringify(responseBody), key]
  )
  return rows[0] || null
}

export async function failIdempotencyRecord(key, responseCode, errorBody, dbClient = null) {
  if (!key) return null
  const runner = dbClient || { query }
  const { rows } = await runner.query(
    `UPDATE idempotency_keys
     SET response_code = $1,
         response_body = $2::jsonb,
         status        = 'FAILED',
         updated_at    = NOW()
     WHERE key = $3
     RETURNING *`,
    [Number(responseCode), JSON.stringify(errorBody), key]
  )
  return rows[0] || null
}
