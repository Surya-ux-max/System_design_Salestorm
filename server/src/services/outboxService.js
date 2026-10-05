import {
  getPendingOutboxEvents,
  markOutboxEventProcessed,
  recordOutboxEventFailure,
} from '../db/repositories/outboxRepo.js'
import { handleOrderCreationEvent } from './orderService.js'

let rabbitConnection = null
let rabbitChannel = null
const RABBIT_EXCHANGE = 'bill4food_events'
const ORDER_QUEUE = 'order_service_queue'

export async function initRabbitMQ() {
  const url = process.env.RABBITMQ_URL
  if (!url) {
    console.log('ℹ️ RABBITMQ_URL not provided. Running in PostgreSQL Transactional Outbox mode.')
    return false
  }

  try {
    const amqp = await import('amqplib')
    rabbitConnection = await amqp.connect(url)
    rabbitChannel = await rabbitConnection.createChannel()

    await rabbitChannel.assertExchange(RABBIT_EXCHANGE, 'topic', { durable: true })
    await rabbitChannel.assertQueue(ORDER_QUEUE, { durable: true })
    await rabbitChannel.bindQueue(ORDER_QUEUE, RABBIT_EXCHANGE, 'order.*')

    // Start consuming
    rabbitChannel.consume(ORDER_QUEUE, async (msg) => {
      if (!msg) return
      try {
        const event = JSON.parse(msg.content.toString())
        if (event.eventType === 'ORDER_PAYMENT_SUCCESS') {
          await handleOrderCreationEvent(event.payload)
        }
        rabbitChannel.ack(msg)
      } catch (err) {
        console.warn(`[RabbitMQ] Consumer failed to process event: ${err.message}. Requeuing...`)
        // Nack with requeue if Order Service is unavailable
        setTimeout(() => rabbitChannel.nack(msg, false, true), 3000)
      }
    })

    console.log('✅ Connected to RabbitMQ successfully')
    return true
  } catch (err) {
    console.warn(`⚠️ Could not connect to RabbitMQ (${err.message}). Using Outbox Worker.`)
    return false
  }
}

/**
 * Process pending outbox events (Transactional Outbox Poller)
 */
export async function processOutboxBatch(batchSize = 20) {
  const pendingEvents = await getPendingOutboxEvents(batchSize)
  if (pendingEvents.length === 0) return 0

  let processedCount = 0

  for (const event of pendingEvents) {
    try {
      if (rabbitChannel) {
        // Publish to RabbitMQ exchange
        const payloadBuffer = Buffer.from(JSON.stringify(event))
        rabbitChannel.publish(RABBIT_EXCHANGE, `order.${event.event_type}`, payloadBuffer, {
          persistent: true,
          messageId: event.event_id,
        })
      }

      // Process event handlers
      if (event.event_type === 'ORDER_PAYMENT_SUCCESS') {
        const payload = typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload
        await handleOrderCreationEvent(payload)
      }

      await markOutboxEventProcessed(event.event_id)
      processedCount++
    } catch (err) {
      console.warn(`[Outbox] Failed processing event ${event.event_id}: ${err.message}`)
      await recordOutboxEventFailure(event.event_id, err.message)
    }
  }

  return processedCount
}
