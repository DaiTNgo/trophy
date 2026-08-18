import { and, eq, isNull, lte, or } from 'drizzle-orm'
import { misaDeletionJobs } from '../db/schema'
import type { AppBindings } from './env'
import { deleteMisaProducts, MisaRequestError } from './misa'

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

export function misaDeletionJobValues(misaProductIds: number[]) {
  const queuedAt = nowIso()
  return [...new Set(misaProductIds)].map((misaProductId) => ({
    id: crypto.randomUUID(),
    misaProductId,
    attempts: 0,
    nextAttemptAt: queuedAt,
    createdAt: queuedAt,
  }))
}

export async function processMisaDeletionJobs(env: AppBindings) {
  const { getDb } = await import('../db/client')
  const db = getDb(env)
  const jobs = await db
    .select()
    .from(misaDeletionJobs)
    .where(and(
      isNull(misaDeletionJobs.completedAt),
      lte(misaDeletionJobs.nextAttemptAt, nowIso()),
      or(isNull(misaDeletionJobs.leaseExpiresAt), lte(misaDeletionJobs.leaseExpiresAt, nowIso())),
    ))
    .limit(BATCH_SIZE)

  for (const job of jobs) {
    const leaseToken = crypto.randomUUID()
    const claimed = await db
      .update(misaDeletionJobs)
      .set({ leaseToken, leaseExpiresAt: leaseExpiresAt() })
      .where(and(
        eq(misaDeletionJobs.id, job.id),
        isNull(misaDeletionJobs.completedAt),
        or(isNull(misaDeletionJobs.leaseExpiresAt), lte(misaDeletionJobs.leaseExpiresAt, nowIso())),
      ))
      .returning({ id: misaDeletionJobs.id })
      .get()
    if (!claimed) continue

    try {
      await deleteMisaProducts(env, [job.misaProductId])
      await db.update(misaDeletionJobs)
        .set({ completedAt: nowIso(), lastError: null, leaseToken: null, leaseExpiresAt: null })
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
          ? { completedAt: nowIso(), lastError: null, leaseToken: null, leaseExpiresAt: null }
          : {
              attempts,
              nextAttemptAt: retryAt(attempts),
              lastError: error instanceof Error ? error.message : 'MISA deletion failed',
              leaseToken: null,
              leaseExpiresAt: null,
            })
        .where(and(eq(misaDeletionJobs.id, job.id), eq(misaDeletionJobs.leaseToken, leaseToken)))
    }
  }
}
