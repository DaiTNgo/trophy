import { and, eq, isNull, lte, or } from 'drizzle-orm'
import { getDb } from '../db/client'
import { misaDeletionJobs } from '../db/schema'
import type { AppBindings } from './env'
import { newOutboxJob, OUTBOX_BATCH_SIZE, outboxLeaseExpiresAt, outboxNow, outboxRetryAt } from './outbox-schedule'
import { deleteMisaProducts, MisaRequestError } from './misa'

export function misaDeletionJobValues(misaProductIds: number[]) {
  const queuedAt = outboxNow()
  return [...new Set(misaProductIds)].map((misaProductId) => ({
    ...newOutboxJob(queuedAt),
    misaProductId,
  }))
}

export async function processMisaDeletionJobs(env: AppBindings) {
  const db = getDb(env)
  const jobs = await db
    .select()
    .from(misaDeletionJobs)
    .where(and(
      isNull(misaDeletionJobs.completedAt),
      lte(misaDeletionJobs.nextAttemptAt, outboxNow()),
      or(isNull(misaDeletionJobs.leaseExpiresAt), lte(misaDeletionJobs.leaseExpiresAt, outboxNow())),
    ))
    .limit(OUTBOX_BATCH_SIZE)

  for (const job of jobs) {
    const leaseToken = crypto.randomUUID()
    const claimed = await db
      .update(misaDeletionJobs)
      .set({ leaseToken, leaseExpiresAt: outboxLeaseExpiresAt() })
      .where(and(
        eq(misaDeletionJobs.id, job.id),
        isNull(misaDeletionJobs.completedAt),
        or(isNull(misaDeletionJobs.leaseExpiresAt), lte(misaDeletionJobs.leaseExpiresAt, outboxNow())),
      ))
      .returning({ id: misaDeletionJobs.id })
      .get()
    if (!claimed) continue

    try {
      await deleteMisaProducts(env, [job.misaProductId])
      await db.update(misaDeletionJobs)
        .set({ completedAt: outboxNow(), lastError: null, leaseToken: null, leaseExpiresAt: null })
        .where(and(eq(misaDeletionJobs.id, job.id), eq(misaDeletionJobs.leaseToken, leaseToken)))
    } catch (error) {
      const completed = error instanceof MisaRequestError &&
        error.status === 404 &&
        error.method === 'DELETE' &&
        error.resource === '/Products'
      const attempts = job.attempts + 1
      if (!completed) {
        console.error('MISA deletion retry failed', { jobId: job.id, misaProductId: job.misaProductId, attempts, error })
      }
      await db.update(misaDeletionJobs)
        .set(completed
          ? { completedAt: outboxNow(), lastError: null, leaseToken: null, leaseExpiresAt: null }
          : {
              attempts,
              nextAttemptAt: outboxRetryAt(attempts),
              lastError: error instanceof Error ? error.message : 'MISA deletion failed',
              leaseToken: null,
              leaseExpiresAt: null,
            })
        .where(and(eq(misaDeletionJobs.id, job.id), eq(misaDeletionJobs.leaseToken, leaseToken)))
    }
  }
}
