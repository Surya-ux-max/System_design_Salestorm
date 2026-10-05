/**
 * Circuit Breaker / Service Status Controller
 * Used for testing distributed system resiliency:
 * Allows simulating temporary Order Service outages and recovery.
 */

class CircuitBreaker {
  constructor() {
    this.orderServiceAvailable = true
    this.failureReason = null
  }

  isOrderServiceAvailable() {
    return this.orderServiceAvailable
  }

  setOrderServiceAvailable(available, reason = null) {
    this.orderServiceAvailable = Boolean(available)
    this.failureReason = reason || (available ? null : 'Simulated Order Service Outage')
    console.log(`[CircuitBreaker] Order Service availability set to: ${this.orderServiceAvailable} (${this.failureReason || 'OK'})`)
  }

  getStatus() {
    return {
      orderServiceAvailable: this.orderServiceAvailable,
      failureReason: this.failureReason,
    }
  }
}

export const circuitBreaker = new CircuitBreaker()
