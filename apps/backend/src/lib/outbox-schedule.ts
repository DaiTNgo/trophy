const RETRY_CAP_MS = 24 * 60 * 60 * 1000
const LEASE_MS = 5 * 60 * 1000

export const OUTBOX_BATCH_SIZE = 50

export const outboxNow = () => new Date().toISOString()

/** Exponential backoff from one minute, capped at a day. */
export function outboxRetryAt(attempts: number) {
  const delay = Math.min(RETRY_CAP_MS, 60_000 * 2 ** Math.min(attempts, 10))
  return new Date(Date.now() + delay).toISOString()
}

export function outboxLeaseExpiresAt() {
  return new Date(Date.now() + LEASE_MS).toISOString()
}

/** Common columns for a newly queued outbox job. */
export function newOutboxJob(queuedAt = outboxNow()) {
  return {
    id: crypto.randomUUID(),
    attempts: 0,
    nextAttemptAt: queuedAt,
    createdAt: queuedAt,
  }
}
