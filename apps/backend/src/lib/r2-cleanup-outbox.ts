import { and, eq, isNull, lte, or } from 'drizzle-orm'
import { getDb } from '../db/client'
import { r2CleanupJobs } from '../db/schema'
import type { AppBindings } from './env'
import { newOutboxJob, OUTBOX_BATCH_SIZE, outboxLeaseExpiresAt, outboxNow, outboxRetryAt } from './outbox-schedule'

export function r2CleanupJobValues(objectKeys: string[]) {
  const queuedAt = outboxNow()
  return [...new Set(objectKeys)].map((objectKey) => ({
    ...newOutboxJob(queuedAt),
    objectKey,
  }))
}

export async function processR2CleanupJobs(env: AppBindings) {
  const db = getDb(env)
  const jobs = await db
    .select()
    .from(r2CleanupJobs)
    .where(and(
      isNull(r2CleanupJobs.completedAt),
      lte(r2CleanupJobs.nextAttemptAt, outboxNow()),
      or(isNull(r2CleanupJobs.leaseExpiresAt), lte(r2CleanupJobs.leaseExpiresAt, outboxNow())),
    ))
    .limit(OUTBOX_BATCH_SIZE)

  for (const job of jobs) {
    const leaseToken = crypto.randomUUID()
    const claimed = await db
      .update(r2CleanupJobs)
      .set({ leaseToken, leaseExpiresAt: outboxLeaseExpiresAt() })
      .where(and(
        eq(r2CleanupJobs.id, job.id),
        isNull(r2CleanupJobs.completedAt),
        or(isNull(r2CleanupJobs.leaseExpiresAt), lte(r2CleanupJobs.leaseExpiresAt, outboxNow())),
      ))
      .returning({ id: r2CleanupJobs.id })
      .get()
    if (!claimed) continue

    try {
      await env.CUSTOMIZATION_ASSETS.delete(job.objectKey)
      await db
        .update(r2CleanupJobs)
        .set({ completedAt: outboxNow(), lastError: null, leaseToken: null, leaseExpiresAt: null })
        .where(and(eq(r2CleanupJobs.id, job.id), eq(r2CleanupJobs.leaseToken, leaseToken)))
    } catch (error) {
      const attempts = job.attempts + 1
      console.error('r2 cleanup retry failed', { jobId: job.id, objectKey: job.objectKey, attempts, error })
      await db
        .update(r2CleanupJobs)
        .set({
          attempts,
          nextAttemptAt: outboxRetryAt(attempts),
          lastError: error instanceof Error ? error.message : 'R2 cleanup failed',
          leaseToken: null,
          leaseExpiresAt: null,
        })
        .where(and(eq(r2CleanupJobs.id, job.id), eq(r2CleanupJobs.leaseToken, leaseToken)))
    }
  }
}
