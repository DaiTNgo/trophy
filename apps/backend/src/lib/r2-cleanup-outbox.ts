import { and, eq, isNull, lte, or } from 'drizzle-orm'
import { r2CleanupJobs } from '../db/schema'
import type { AppBindings } from './env'

const RETRY_CAP_MS = 24 * 60 * 60 * 1000
const BATCH_SIZE = 50
const LEASE_MS = 5 * 60 * 1000

const nowIso = () => new Date().toISOString()

function retryAt(attempts: number) {
  const delay = Math.min(RETRY_CAP_MS, 60_000 * 2 ** Math.min(attempts, 10))
  return new Date(Date.now() + delay).toISOString()
}

function leaseExpiresAt() {
  return new Date(Date.now() + LEASE_MS).toISOString()
}

export function r2CleanupJobValues(objectKeys: string[]) {
  const queuedAt = nowIso()
  return [...new Set(objectKeys)].map((objectKey) => ({
    id: crypto.randomUUID(),
    objectKey,
    attempts: 0,
    nextAttemptAt: queuedAt,
    createdAt: queuedAt,
  }))
}

export async function processR2CleanupJobs(env: AppBindings) {
  const { getDb } = await import('../db/client')
  const db = getDb(env)
  const jobs = await db
    .select()
    .from(r2CleanupJobs)
    .where(and(
      isNull(r2CleanupJobs.completedAt),
      lte(r2CleanupJobs.nextAttemptAt, nowIso()),
      or(isNull(r2CleanupJobs.leaseExpiresAt), lte(r2CleanupJobs.leaseExpiresAt, nowIso())),
    ))
    .limit(BATCH_SIZE)

  for (const job of jobs) {
    const leaseToken = crypto.randomUUID()
    const claimed = await db
      .update(r2CleanupJobs)
      .set({ leaseToken, leaseExpiresAt: leaseExpiresAt() })
      .where(and(
        eq(r2CleanupJobs.id, job.id),
        isNull(r2CleanupJobs.completedAt),
        or(isNull(r2CleanupJobs.leaseExpiresAt), lte(r2CleanupJobs.leaseExpiresAt, nowIso())),
      ))
      .returning({ id: r2CleanupJobs.id })
      .get()
    if (!claimed) continue

    try {
      await env.CUSTOMIZATION_ASSETS.delete(job.objectKey)
      await db
        .update(r2CleanupJobs)
        .set({ completedAt: nowIso(), lastError: null, leaseToken: null, leaseExpiresAt: null })
        .where(and(eq(r2CleanupJobs.id, job.id), eq(r2CleanupJobs.leaseToken, leaseToken)))
    } catch (error) {
      const attempts = job.attempts + 1
      console.error('r2 cleanup retry failed', { jobId: job.id, objectKey: job.objectKey, attempts, error })
      await db
        .update(r2CleanupJobs)
        .set({
          attempts,
          nextAttemptAt: retryAt(attempts),
          lastError: error instanceof Error ? error.message : 'R2 cleanup failed',
          leaseToken: null,
          leaseExpiresAt: null,
        })
        .where(and(eq(r2CleanupJobs.id, job.id), eq(r2CleanupJobs.leaseToken, leaseToken)))
    }
  }
}
